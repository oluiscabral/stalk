# 🕵️ Stalk - Social Tracking & Auto-Link Kit

*The GitHub following tool that does what we're all thinking but too polite to say.*

Stop pretending you're not already stalking people's GitHub profiles. **Stalk** just automates the awkward part.

A Node.js script that automatically manages mutual following relationships on GitHub using the GitHub API, with advanced recursive following capabilities that would make even the most dedicated social media stalker jealous.

## 🎯 What Stalk Does (Because We're Being Honest Here)

**Stalk** creates perfect mutual following relationships by doing the digital equivalent of sliding into DMs, but for GitHub:

### Standard Stalking Mode 👀
- **Following Back**: Automatically follows users who follow you but you don't follow back *(basic courtesy stalking)*
- **Unfollowing Non-Followers**: Unfollows users you follow who don't follow you back *(dignity preservation)*

### Ambitious Stalking Mode 🚀
*For when you want to take your GitHub social game to the next level:*

1. **Depth-First Stalking**: Starting from a target user, follows their followers
2. **Recursive Stalking**: Then follows the followers of those followers, and so on
3. **Smart Stalking Limits**: Configurable depth and per-user limits to prevent API exhaustion
4. **Anti-Stalking-Loop Protection**: Tracks processed users to avoid infinite stalking cycles

*Because manually following people is so 2020.*

## ✨ Features

- 🔄 **Mutual Follow Management**: Automatically follow back followers and unfollow non-followers
- 🚀 **Ambitious Recursive Following**: Recursively follow followers of followers using depth-first traversal
- 🔍 **Safe Dry-Run Mode**: Preview your stalking strategy before executing it
- 🔒 **Secure Authentication**: Token-based GitHub API authentication
- 📊 **Detailed Analytics**: Comprehensive stalking progress reporting and statistics
- ⚡ **Rate Limiting Protection**: Respects GitHub API limits with intelligent delays
- 🛡️ **Error Handling**: Robust error recovery and logging
- 📋 **Clear Status Updates**: Real-time stalking progress tracking
- 🔄 **Cycle Detection**: Prevents infinite stalking loops

## 🚀 Setup (Your Stalking Toolkit)

1. **Clone your new stalking headquarters:**
   ```bash
   git clone https://github.com/oluiscabral/stalk.git
   cd stalk
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Get GitHub Personal Access Token (Your Stalking License):**
   - Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Give it a name like "Stalk Token" *(be proud of what you're doing)*
   - Select the `user:follow` scope (required for professional stalking)
   - Copy the generated token

4. **Add token to .env file:**
   ```
   GITHUB_TOKEN=your_github_personal_access_token_here
   ```

## 🎮 Usage (Time to Stalk!)

### Standard Mutual Following Stalking

#### Dry Run (Recommended for Stalking Beginners)
Preview what Stalk would do without actually following/unfollowing anyone:
```bash
npm run dry-run
```

#### Live Stalking Mode
Execute the mutual follow management:
```bash
npm start
```

### Ambitious Recursive Stalking 🚀
*For advanced stalkers only*

#### Dry Run Ambitious Stalking
Preview recursive following from a target user:
```bash
node main.js --dry-run --ambitious username
# or
node main.js --dry-run -a username
```

#### Live Ambitious Stalking
Execute recursive following *(use with caution - this is serious stalking)*:
```bash
node main.js --ambitious username
# or
node main.js -a username
```

#### Combined Stalking Mode
Run both mutual follow management AND ambitious recursive stalking:
```bash
node main.js --ambitious username  # Maximum stalking efficiency
```

## 🧠 How Stalk Works (The Stalking Algorithm)

### Standard Stalking Mode
1. **Authentication**: Connects to GitHub API using your stalking credentials
2. **Intelligence Gathering**: Fetches your complete following and followers lists
3. **Relationship Analysis**: Identifies mutual vs non-mutual relationships
4. **Strategic Following**: Follows users who follow you but you don't follow back
5. **Dignity Cleanup**: Unfollows users you follow who don't follow you back

### Ambitious Stalking Mode
1. **Standard Operations**: First completes mutual follow management
2. **Target Analysis**: Fetches followers of the specified target user
3. **Depth-First Stalking Traversal**: For each follower:
   - Follows the user (if not already following)
   - Recursively processes their followers *(stalking their network)*
   - Continues up to maximum depth (default: 3 levels of stalking)
4. **Smart Stalking Limiting**: 
   - Maximum 50 followers processed per user (configurable)
   - Cycle detection prevents infinite stalking loops
   - Rate limiting prevents API exhaustion

## 🛡️ Safety Features (Responsible Stalking)

- **Dry Run Mode**: Test your stalking strategy without making any changes
- **Rate Limiting**: Respects GitHub API limits with intelligent delays
- **Cycle Detection**: Prevents infinite stalking loops
- **Depth Limiting**: Maximum stalking recursion depth (default: 3 levels)
- **Per-User Limits**: Maximum followers processed per user (default: 50)
- **Error Handling**: Continues stalking even if individual requests fail
- **Progress Tracking**: Shows detailed stalking progress and final statistics
- **Confirmation Delays**: Countdown before starting stalking operations

## ⚙️ Configuration (Stalking Parameters)

You can modify these stalking limits in the code:

```javascript
this.maxDepth = 3;           // Maximum stalking recursion depth
this.maxFollowsPerUser = 50; // Maximum followers per stalking target
```

## 📊 Sample Output (Stalking in Action)

### Standard Stalking Mode
```
🕵️ Stalk - Social Tracking & Auto-Link Kit
🔐 Authenticated as: yourusername
📊 Public repos: 25 | Followers: 150 | Following: 200
⚠️  LIVE STALKING MODE - Users will be followed/unfollowed

📊 Stalking Analysis Results:
   Following: 200
   Followers: 150
   Need to follow back: 25
   Need to unfollow: 75

🚀 Following back users...
[1/25] Following back: user1
   ✅ Followed: user1

🚀 Unfollowing non-followers...
[1/75] Unfollowing: user3
   ✅ Unfollowed: user3

📊 Final Stalking Results:
   ➕ Successfully followed back: 25
   ➖ Successfully unfollowed: 75
```

### Ambitious Stalking Mode
```
🕵️ Stalk - Social Tracking & Auto-Link Kit
🔐 Authenticated as: yourusername
🚀 AMBITIOUS STALKING MODE ENABLED - Will recursively stalk followers of: targetuser
📏 Max stalking depth: 3 levels | Max per target: 50 followers

🚀 Starting ambitious recursive stalking...
🎯 Primary stalking target: targetuser

🎯 Processing targetuser (stalking depth: 0)
🔍 Fetching followers of: targetuser (limit: 50)
✅ Found 50 stalking targets for targetuser

  [1/50] Following: follower1
    ✅ Followed: follower1
    
    🎯 Processing follower1 (stalking depth: 1)
    🔍 Fetching followers of: follower1 (limit: 50)
    ✅ Found 30 stalking targets for follower1
    
      [1/30] Following: subfollower1
        ✅ Followed: subfollower1

📊 Final Stalking Results:
   🚀 Ambitious stalking follows: 127
   👥 Total stalked users: 45
```

## 🔑 Token Permissions (Your Stalking License)

Your GitHub token needs the `user:follow` scope to:
- Read your following/followers lists *(basic stalking intel)*
- Read other users' followers lists *(advanced stalking intel)*
- Follow and unfollow users *(execute stalking operations)*

## ⏱️ Rate Limits (Stalking Responsibly)

- GitHub API allows 5,000 requests per hour for authenticated requests
- Standard stalking mode: 1-second delays between operations
- Ambitious stalking mode: 1.5-second delays between operations
- Can safely process ~2,400 stalking operations per hour in ambitious mode

## 🔒 Security Notes (Stalking Ethics)

- Keep your `.env` file private and never commit it to version control
- The token only needs `user:follow` scope - don't grant unnecessary stalking permissions
- You can revoke the token anytime from GitHub settings
- **Use ambitious stalking mode carefully** - it can follow many users quickly
- Remember: With great stalking power comes great stalking responsibility

## 🤔 Why Use Stalk?

- **Clean Following Lists**: Maintain organized, mutual relationships
- **Strategic Network Growth**: Intelligently expand your GitHub network
- **Social Reciprocity**: Ensure you follow back your followers
- **Account Management**: Keep your GitHub social connections tidy
- **Time Saving**: Automate tedious manual follow/unfollow tasks
- **Safe Operation**: Dry-run mode prevents accidental stalking mistakes
- **Smart Growth**: Recursive following helps discover relevant users
- **Honest Branding**: We call it what it is - no pretense here

## 🐛 Troubleshooting (When Stalking Goes Wrong)

**"GitHub token is required" error:**
- Make sure you copied `.env.example` to `.env`
- Verify your stalking token is correctly set in the `.env` file

**"Failed to authenticate" error:**
- Check that your stalking token is valid and not expired
- Ensure the token has `user:follow` scope

**"Ambitious stalking mode requires a target username" error:**
- Make sure to provide a username: `--ambitious username`
- Check that the target username exists and is public

**Rate limiting errors:**
- Stalk handles this automatically with delays
- If you hit limits, wait an hour and try again
- Consider reducing `maxFollowsPerUser` for large stalking operations

**"Perfect!