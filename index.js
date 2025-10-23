const axios = require('axios');
const process = require('process');
const fs = require('fs');
const path = require('path');


// Define global variables
const adminUser = {
  apiUser: '',
  apiKey: '',
};
const alternativeInviterUser = {
  apiUser: '',
  apiKey: '',
};
let minLvl = 0;
let minLogins = 0; // Minimum number of logins required
let fetchInterval = 60; // Default fetch interval in seconds
let language = '';


// Parse command-line arguments
const args = process.argv.slice(2);
args.forEach((arg, index) => {
  if (arg === '--admin-api-user') { adminUser.apiUser = args[index + 1]; }   
  if (arg === '--admin-api-key') { adminUser.apiKey = args[index + 1]; }
  if (arg === '--inviter-api-user') { alternativeInviterUser.apiUser = args[index + 1]; }
  if (arg === '--inviter-api-key') { alternativeInviterUser.apiKey = args[index + 1]; }
  if (arg === '--fetch-interval') { fetchInterval = parseInt(args[index + 1], 10); }
  if (arg === '--min-lvl') { minLvl = parseInt(args[index + 1], 10); }
  if (arg === '--min-logins') { minLogins = parseInt(args[index + 1], 10); }
  if (arg === '--language') { language = args[index + 1]; }
});

if (fetchInterval < 30) {
  console.error('Fetch interval must be at least 30 seconds. This is the official Habitica API requirement.');
  process.exit(1);
}

// Validate that admin credentials were provided.
if (!adminUser.apiUser || !adminUser.apiKey) {
  console.error('You must provide your API user and key. (Use --admin-api-user and --admin-api-key flags)');
  process.exit(1);
}


// Keep track of invited users in a JSON file for future reference and to avoid inviting the same user multiple times in a short period of time.
const invitedUsersFilePath = path.join(__dirname, 'data', 'invitedUsers.json');
fs.mkdirSync(path.dirname(invitedUsersFilePath), { recursive: true });
const invitedUsersData = fs.existsSync(invitedUsersFilePath)
  ? JSON.parse(fs.readFileSync(invitedUsersFilePath, 'utf8'))
  : {};

// Create a log and error directory if it doesn't exist.
const seenUsersLogFilePath = path.join(__dirname, 'logs', 'seenUserData.log');
fs.mkdirSync(path.dirname(seenUsersLogFilePath), { recursive: true });
fs.writeFileSync(seenUsersLogFilePath, ''); // Clear the log file on initiation.
const writeLog = (message) => {
  if (!fs.existsSync(path.dirname(seenUsersLogFilePath))) {
    fs.mkdirSync(path.dirname(seenUsersLogFilePath), { recursive: true });
  }
  fs.appendFileSync(seenUsersLogFilePath, `${ new Date().toISOString() }: ${ message }\n`);
};

// Prep the error log file.
const errorLogFilePath = path.join(__dirname, 'logs', 'errors.log');
fs.mkdirSync(path.dirname(errorLogFilePath), { recursive: true });
fs.writeFileSync(errorLogFilePath, ''); // Clear the error log file on initiation.
const writeErrorLog = (message) => {
  if (!fs.existsSync(path.dirname(errorLogFilePath))) {
    fs.mkdirSync(path.dirname(errorLogFilePath), { recursive: true });
  }
  fs.appendFileSync(errorLogFilePath, `${ new Date().toISOString() }: ${ message }\n`);
};


// Start the process.
console.log(`Welcome to Habitica Auto Party Invites! This will run every ${ fetchInterval } seconds and invite members to your party that meet your criteria.`);
autoPartyInvite();
setInterval(autoPartyInvite, fetchInterval * 1000);


async function autoPartyInvite() {
  console.log('Fetching users and inviting them to party...');
  try {
    // Fetch users looking for party (LFP) from Habitica API.
    const response = await fetchLFPUsers();

    const inviteeUserList = response
      .filter(validateUserCriteria) // Filter users based on criteria.
      .filter(Boolean); // Remove anything that is not a valid user object.

    // Log every user that is seen.
    if (response?.length > 0) {
      const seenUsersLogData = response.map(user => ({
        name: user.profile.name,
        invitedThisTime: inviteeUserList.some(invitee => invitee._id === user._id),
        lvl: user.stats.lvl,
        logins: user.loginIncentives,
        class: user.stats.class,
        language: user.preferences.language,
        id: user._id,
      }));
      writeLog(JSON.stringify(seenUsersLogData, null, 2));
    }
    
    if (inviteeUserList?.length > 0) {
      await inviteUsers(inviteeUserList);
    } else {
      console.log(`No users to invite (Saw ${ response.length } users). Retry in ${ fetchInterval } seconds.`);
    }
  } catch (error) {
    console.error(`Something went wrong: ${ error.message }`);
    writeErrorLog(JSON.stringify({ message: error.message, stack: error.stack }, null, 2));
  }
}


async function fetchLFPUsers() {
  try {
    const response = await axios.get('https://habitica.com/api/v3/looking-for-party', {
      headers: {
        'content-type': 'application/json',
        'x-client': 'b6ae607d-ad3b-4086-ae5a-e511c4cb24d7-AutoPartyInvites',
        'x-api-user': adminUser.apiUser,
        'x-api-key': adminUser.apiKey,
      },
      timeout: 10000,
    });

    if (!response?.data?.success) {
      throw new Error('Request failed, please check your API user and key.');
    }
    return response?.data?.data;
  } catch (error) {
    console.error(`Failed to fetch LFP users: ${ error.message }`);
    writeErrorLog(JSON.stringify(error, null, 2));
    return false;
  }
}

async function inviteUsers(inviteeUsers) {
  try {
    // Make POST request to Habitica API
    const body = { uuids: inviteeUsers.map(user => user._id) };
    await axios.post('https://habitica.com/api/v3/groups/party/invite', body, {
      headers: {
        'content-type': 'application/json',
        'x-client': 'b6ae607d-ad3b-4086-ae5a-e511c4cb24d7-AutoPartyInvites',
        'x-api-user': alternativeInviterUser?.apiUser || adminUser.apiUser,
        'x-api-key': alternativeInviterUser?.apiKey || adminUser.apiKey,
      },
    });

    // Save invited users to the data file.
    inviteeUsers.forEach((user) => {
      invitedUsersData[user._id] = {
        lastInviteUTC: new Date().toISOString(),
        name: user.profile.name,
        lvl: user.stats.lvl,
        logins: user.loginIncentives,
      };
    });
    fs.writeFileSync(invitedUsersFilePath, JSON.stringify(invitedUsersData, null, 2));

    console.log(`Invited ${ inviteeUsers.length } user(s) named ${ inviteeUsers.map(user => user.profile.name).join(', ') } at ${ new Date().toLocaleTimeString() }. Relaunching in ${ fetchInterval } seconds.`);
  } catch (error) {
    console.error(`Failed to invite user(s): ${ error.message }`);
    writeErrorLog(JSON.stringify(error, null, 2));
  }
}


function validateUserCriteria(user) {
  if (!user._id) { return false; } // User ID must exist
  if (user.stats.lvl < minLvl) { return false; } // User level must meet minimum level
  if (user.loginIncentives < minLogins) { return false; } // User must have enough logins

  if (language && user.preferences.language !== language) {
    return false; // User language must match the specified language
  }

  // Ignore users that have been invited within the last 36 hours.
  // This is a courtesy to potential invitees, please do not reduce this timeframe.
  if (invitedUsersData[user._id]) {
    const lastInviteDate = new Date(invitedUsersData[user._id].lastInviteUTC);
    const now = new Date();
    const thirtySixHoursAgo = new Date(now.getTime() - (36 * 60 * 60 * 1000)); // 36 hours ago
    if (lastInviteDate >= thirtySixHoursAgo) {
      return false;
    }
  }

  return true;
}