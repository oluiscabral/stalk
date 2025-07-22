# GUS (GitHub Unfollow Script)

A Node.js script that uses the GitHub API to unfollow users who don't follow you back.

## Features

- ✅ Safe dry-run mode to preview changes
- 🔒 Secure token-based authentication
- 📊 Detailed analytics and progress reporting
- ⚡ Rate limiting protection
- 🛡️ Error handling and recovery
- 📋 Clear logging and status updates

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Get GitHub Personal Access Token:**
   - Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Give it a name like "Unfollow Script"
   - Select the `user:follow` scope (required to follow/unfollow users)
   - Copy the generated token

4. **Add token to .env file:**
   ```
   GITHUB_TOKEN=your_github_personal_access_token_here
   ```

## Usage

### Dry Run (Recommended First)
Preview who would be unfollowed without making changes:
```bash
npm run dry-run
```

### Live Run
Actually unfollow users who don't follow back:
```bash
npm start
```

## How It Works

1. **Authentication**: Connects to GitHub API using your personal access token
2. **Data Collection**: Fetches your complete following and followers lists
3. **Analysis**: Identifies users you follow who don't follow you back
4. **Action**: Unfollows non-reciprocal connections (with rate limiting)

## Safety Features

- **Dry Run Mode**: Test the script without making changes
- **Rate Limiting**: Respects GitHub API limits with delays between requests
- **Error Handling**: Continues processing even if individual requests fail
- **Progress Tracking**: Shows detailed progress and final statistics
- **Confirmation**: 3-second delay before starting live unfollows

## Sample Output

```
🔐 Authenticated as: yourusername
📊 Public repos: 25 | Followers: 150 | Following: 200
⚠️  LIVE MODE - Users will be unfollowed

📋 Fetching users you follow...
   📄 Page 1: 100 users
   📄 Page 2: 100 users
✅ Total following: 200

👥 Fetching your followers...
   📄 Page 1: 100 users
   📄 Page 2: 50 users
✅ Total followers: 150

📊 Analysis Results:
   Following: 200
   Followers: 150
   Non-follow backs: 75

🚀 Processing unfollows...

[1/75] Processing: user1
   ✅ Unfollowed: user1
[2/75] Processing: user2
   ✅ Unfollowed: user2

📊 Final Results:
   ✅ Successfully processed: 75
   ❌ Failed: 0

🎉 Unfollowing complete!
```

## Token Permissions

Your GitHub token needs the `user:follow` scope to:
- Read your following/followers lists
- Unfollow users

## Rate Limits

- GitHub API allows 5,000 requests per hour for authenticated requests
- Script includes 1-second delays between unfollows to be respectful
- Can process ~3,600 unfollows per hour safely

## Security Notes

- Keep your `.env` file private and never commit it to version control
- The token only needs `user:follow` scope - don't grant unnecessary permissions
- You can revoke the token anytime from GitHub settings

## Troubleshooting

**"GitHub token is required" error:**
- Make sure you copied `.env.example` to `.env`
- Verify your token is correctly set in the `.env` file

**"Failed to authenticate" error:**
- Check that your token is valid and not expired
- Ensure the token has `user:follow` scope

**Rate limiting errors:**
- The script handles this automatically with delays
- If you hit limits, wait an hour and try again
