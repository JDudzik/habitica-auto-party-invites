# Habitica Auto Party Invites

This script automates the process of inviting Habitica users who meet specific criteria to your party. It periodically fetches users looking for a party from the Habitica API, filters them based on your defined criteria, and sends invitations for them to join your party.


## Features

- You can filter users based on:
  - Minimum level.
  - Minimum number of logins.
  - Preferred language.
- You can set the search interval.
- You will receive a notification message on Habitica whenever a user has been invited to your party.
- You can provide a separate admin user (who searches for party members) and an inviter user (who invites the user into their party). Very useful if you're a member and not the leader of your party.
- This script keeps track of previously invited users in order to prevent spam.
- Keeps logs of every user the script has seen even if they didn't meet the criteria. Useful for checking that your criteria is accurate.
- Also keeps error logs for debugging.

## Requirements

- Unix based OS (eg: Linux or MacOS). This should also work on Windows, but it's untested.
- Node.js installed on your system.
- Habitica API credentials (API User ID and API Key).

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JDudzik/habitica-auto-party-invites.git
   cd habitica-auto-party-invites
   ```
   Alternatively, you can download this codebase directly from github as a .zip file.

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Run the script with the following command-line arguments:

```bash
npm run start
```

### Options

| Flag                  | Description                                                                 | Example                           |
|-----------------------|-----------------------------------------------------------------------------|-----------------------------------|
| `--admin-api-user`    | Your Habitica API User.                                                    | `--admin-api-user <your-api-user-id>` |
| `--admin-api-key`     | Your Habitica API Key.                                                     | `--admin-api-key <your-api-key>`      |
| `--inviter-api-user`  | (Optional) Alternative API User for sending invites.                       | `--inviter-api-user <alt-user-id>`    |
| `--inviter-api-key`   | (Optional) Alternative API Key for sending invites.                        | `--inviter-api-key <alt-user-key>`    |
| `--fetch-interval`    | Interval (in seconds) between fetches. Must be at least 30 seconds. This is the official Habitica API requirement. | `--fetch-interval 60`            |
| `--min-lvl`           | Minimum level required for users to be invited.                           | `--min-lvl 10`                   |
| `--min-logins`        | Minimum number of logins required for users to be invited.                | `--min-logins 5`                 |
| `--language`          | Preferred language of users to be invited.                                | `--language en`                  |
| `--no-notification`   | This is disable sending a notification to yourself when a user is invited.| `--no-notification`              |

### Example Command

```bash
npm run start --admin-api-user abc123-a321... --admin-api-key 312cba-123b... --fetch-interval 60 --min-lvl 10 --min-logins 5 --language en
```

## Using the Inviter User
This is a more advanced feature. To do this, you will need 2 Habitica accounts. The admin user and the inviter user.
This feature is mostly helpful in the situation that your character is in a party, but you aren't the leader and still want to invite new players.
- The admin should be the leader of a party so they have access to view players who are looking for a party.
- The inviter should be in the party you want to invite those players into.

## Logs
- **Seen Users Log**: Logs all users fetched from the Habitica API, including their details and whether they were invited. Saved in `logs/seenUserData.log`.
- **Error Log**: Logs errors encountered during execution. Saved in `logs/errors.log`.

## Data Persistence
The script keeps track of invited users in `/data/invitedUsers.json` to avoid re-inviting the same user within a short timespan.

## License
This project is licensed under the GPL-V3 License. See the LICENSE file for details.
