# GMF (GitHub Mutual Follow Manager)

A Node.js script that automatically manages mutual following relationships on GitHub using the GitHub API.

## Features

- 🔄 **Mutual Follow Management**: Automatically follow back followers and unfollow non-followers
- 🔍 **Safe Dry-Run Mode**: Preview changes before executing them
- 🔒 **Secure Authentication**: Token-based GitHub API authentication
- 📊 **Detailed Analytics**: Comprehensive progress reporting and statistics
- ⚡ **Rate Limiting Protection**: Respects GitHub API limits with intelligent delays
- 🛡️ **Error Handling**: Robust error recovery and logging
- 📋 **Clear Status Updates**: Real-time progress tracking

## What GMF Does

GMF creates perfect mutual following relationships by:

1. **Following Back**: Automatically follows users who follow you but you don't follow back
2. **Unfollowing Non-Followers**: Unfollows users you follow who don't follow you back

After running GMF, you'll have mutual following relationships with all your GitHub connections.

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
   - Give it a name like "GMF Token"
   - Select the `user:follow` scope (required to follow/unfollow users)
   - Copy the generated token

4. **Add token to .env file:**
   ```
   GITHUB_TOKEN=your_github_personal_access_token_here
   ```

## Usage

### Dry Run (Recommended First)
Preview what changes GMF would make without actually following/unfollowing anyone:
```bash
npm run dry-run
```

### Live Run
Execute the mutual follow management:
```bash
npm start
```

## How GMF Works

1. **Authentication**: Connects to GitHub API using your personal access token
2. **Data Collection**: Fetches your complete following and followers lists
3. **Analysis**: Identifies mutual vs non-mutual relationships
4. **Follow Back**: Follows users who follow you but you don't follow back
5. **Cleanup**: Unfollows users you follow who don't follow you back

## Safety Features

- **Dry Run Mode**: Test GMF without making any changes to your account
- **Rate Limiting**: Respects GitHub API limits with 1-second delays between actions
- **Error Handling**: Continues processing even if individual requests fail
- **Progress Tracking**: Shows detailed progress and final statistics
- **Confirmation Delay**: 3-second countdown before starting live operations

## Sample Output

```
🔐 Authenticated as: yourusername
📊 Public repos: 25 | Followers: 150 | Following: 200
⚠️  LIVE MODE - Users will be followed/unfollowed

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
   Need to follow back: 25
   Need to unfollow: 75

➕ Users to follow back (they follow you, but you don't follow them):
   1. user1
   2. user2
   ...

➖ Users to unfollow (you follow them, but they don't follow you):
   1. user3
   2. user4
   ...

🚀 Following back users...

[1/25] Following back: user1
   ✅ Followed: user1
[2/25] Following back: user2
   ✅ Followed: user2

🚀 Unfollowing non-followers...

[1/75] Unfollowing: user3
   ✅ Unfollowed: user3
[2/75] Unfollowing: user4
   ✅ Unfollowed: user4

📊 Final Results:
   ➕ Successfully followed back: 25
   ❌ Failed to follow: 0
   ➖ Successfully unfollowed: 75
   ❌ Failed to unfollow: 0

🎉 Mutual follow management complete!
💡 You now have mutual following relationships with all your connections.
```

## Token Permissions

Your GitHub token needs the `user:follow` scope to:
- Read your following/followers lists
- Follow and unfollow users

## Rate Limits

- GitHub API allows 5,000 requests per hour for authenticated requests
- GMF includes 1-second delays between follow/unfollow actions
- Can safely process ~3,600 operations per hour

## Security Notes

- Keep your `.env` file private and never commit it to version control
- The token only needs `user:follow` scope - don't grant unnecessary permissions
- You can revoke the token anytime from GitHub settings

## Why Use GMF?

- **Clean Following Lists**: Maintain organized, mutual relationships
- **Social Reciprocity**: Ensure you follow back your followers
- **Account Management**: Keep your GitHub social connections tidy
- **Time Saving**: Automate tedious manual follow/unfollow tasks
- **Safe Operation**: Dry-run mode prevents accidental changes

## Troubleshooting

**"GitHub token is required" error:**
- Make sure you copied `.env.example` to `.env`
- Verify your token is correctly set in the `.env` file

**"Failed to authenticate" error:**
- Check that your token is valid and not expired
- Ensure the token has `user:follow` scope

**Rate limiting errors:**
- GMF handles this automatically with delays
- If you hit limits, wait an hour and try again

**"Perfect! You have mutual following with everyone" message:**
- This means your account already has mutual relationships
- No changes are needed

## Contributing

GMF is designed to be simple and focused. If you have suggestions for improvements, please open an issue or submit a pull request.

## License

MIT License - feel free to use GMF for your GitHub account management needs!
