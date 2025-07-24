import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

class StalkManager {
  constructor(token) {
    if (!token) {
      throw new Error("GitHub token is required. Please set GITHUB_TOKEN in your .env file");
    }

    this.octokit = new Octokit({
      auth: token,
    });

    this.username = null;
    this.isDryRun = process.argv.includes("--dry-run");
    this.isAmbitious = process.argv.includes("--ambitious") || process.argv.includes("-a");
    this.targetUser = this.getTargetUser();
    this.processedUsers = new Set(); // Track processed users to avoid stalking cycles
    this.followedInSession = new Set(); // Track users followed in this stalking session
    this.maxDepth = 3; // Maximum stalking recursion depth for safety
    this.maxFollowsPerUser = 50; // Maximum followers to stalk per user
  }

  getTargetUser() {
    const args = process.argv;
    const ambitiousIndex = args.findIndex(arg => arg === "--ambitious" || arg === "-a");
    
    if (ambitiousIndex !== -1 && ambitiousIndex + 1 < args.length) {
      return args[ambitiousIndex + 1];
    }
    
    return null;
  }

  async init() {
    try {
      // Get authenticated user info
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      this.username = user.login;
      console.log(`🕵️ Stalk - Social Tracking & Auto-Link Kit`);
      console.log(`🔐 Authenticated as: ${this.username}`);
      console.log(`📊 Public repos: ${user.public_repos} | Followers: ${user.followers} | Following: ${user.following}`);

      if (this.isDryRun) {
        console.log("🔍 DRY RUN MODE - No actual stalking will occur (just planning)");
      } else {
        console.log("⚠️  LIVE STALKING MODE - Users will be followed/unfollowed");
      }

      if (this.isAmbitious) {
        if (!this.targetUser) {
          throw new Error("Ambitious stalking mode requires a target username. Usage: --ambitious [username] or -a [username]");
        }
        console.log(`🚀 AMBITIOUS STALKING MODE ENABLED - Will recursively stalk followers of: ${this.targetUser}`);
        console.log(`📏 Max stalking depth: ${this.maxDepth} levels | Max per target: ${this.maxFollowsPerUser} followers`);
      }
      
      console.log("");
    } catch (error) {
      throw new Error(`Failed to authenticate: ${error.message}`);
    }
  }

  async getAllFollowing() {
    console.log("📋 Fetching users you're currently stalking (following)...");
    const following = [];
    let page = 1;

    while (true) {
      try {
        const { data } = await this.octokit.rest.users.listFollowedByAuthenticatedUser({
          per_page: 100,
          page: page,
        });

        if (data.length === 0) break;

        following.push(...data.map((user) => user.login));
        console.log(`   📄 Page ${page}: ${data.length} users`);
        page++;

        // Rate limiting protection
        await this.sleep(100);
      } catch (error) {
        throw new Error(`Failed to fetch following list: ${error.message}`);
      }
    }

    console.log(`✅ Total currently stalking: ${following.length}\n`);
    return following;
  }

  async getAllFollowers() {
    console.log("👥 Fetching your stalkers (followers)...");
    const followers = [];
    let page = 1;

    while (true) {
      try {
        const { data } = await this.octokit.rest.users.listFollowersForAuthenticatedUser({
          per_page: 100,
          page: page,
        });

        if (data.length === 0) break;

        followers.push(...data.map((user) => user.login));
        console.log(`   📄 Page ${page}: ${data.length} stalkers`);
        page++;

        // Rate limiting protection
        await this.sleep(100);
      } catch (error) {
        throw new Error(`Failed to fetch followers list: ${error.message}`);
      }
    }

    console.log(`✅ Total stalkers: ${followers.length}\n`);
    return followers;
  }

  async getUserFollowers(username, limit = this.maxFollowsPerUser) {
    console.log(`🔍 Fetching stalking targets from: ${username} (limit: ${limit})`);
    const followers = [];
    let page = 1;
    let fetched = 0;

    while (fetched < limit) {
      try {
        const perPage = Math.min(100, limit - fetched);
        const { data } = await this.octokit.rest.users.listFollowersForUser({
          username: username,
          per_page: perPage,
          page: page,
        });

        if (data.length === 0) break;

        const usernames = data.map((user) => user.login);
        followers.push(...usernames);
        fetched += data.length;
        
        console.log(`   📄 Page ${page}: ${data.length} stalking targets (${fetched}/${limit})`);
        page++;

        // Rate limiting protection
        await this.sleep(200);

        if (data.length < perPage) break; // No more pages
      } catch (error) {
        if (error.status === 404) {
          console.log(`   ⚠️  User ${username} not found or has private followers (anti-stalking measures)`);
          break;
        }
        console.log(`   ❌ Failed to fetch stalking targets for ${username}: ${error.message}`);
        break;
      }
    }

    console.log(`✅ Found ${followers.length} stalking targets for ${username}\n`);
    return followers;
  }

  async followUser(username) {
    try {
      if (this.isDryRun) {
        console.log(`   🔍 [DRY RUN] Would stalk: ${username}`);
        return true;
      }

      await this.octokit.rest.users.follow({
        username: username,
      });

      console.log(`   ✅ Now stalking: ${username}`);
      this.followedInSession.add(username);
      return true;
    } catch (error) {
      console.log(`   ❌ Failed to stalk ${username}: ${error.message}`);
      return false;
    }
  }

  async unfollowUser(username) {
    try {
      if (this.isDryRun) {
        console.log(`   🔍 [DRY RUN] Would stop stalking: ${username}`);
        return true;
      }

      await this.octokit.rest.users.unfollow({
        username: username,
      });

      console.log(`   ✅ Stopped stalking: ${username}`);
      return true;
    } catch (error) {
      console.log(`   ❌ Failed to stop stalking ${username}: ${error.message}`);
      return false;
    }
  }

  async isFollowing(username) {
    try {
      await this.octokit.rest.users.checkPersonFollowedByAuthenticated({
        username: username,
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async recursiveStalk(username, currentFollowing, depth = 0, maxDepth = this.maxDepth) {
    if (depth >= maxDepth) {
      console.log(`   🛑 Max stalking depth (${maxDepth}) reached for ${username}`);
      return { followed: 0, skipped: 0 };
    }

    if (this.processedUsers.has(username)) {
      console.log(`   🔄 Already processed ${username}, skipping to avoid stalking cycles`);
      return { followed: 0, skipped: 0 };
    }

    this.processedUsers.add(username);
    
    console.log(`\n${'  '.repeat(depth)}🎯 Processing ${username} (stalking depth: ${depth})`);
    
    // Get stalking targets from this user
    const followers = await this.getUserFollowers(username);
    
    let followedCount = 0;
    let skippedCount = 0;

    for (const follower of followers) {
      // Skip if it's ourselves (no self-stalking)
      if (follower === this.username) {
        continue;
      }

      // Skip if we already stalk them or stalked them in this session
      if (currentFollowing.has(follower) || this.followedInSession.has(follower)) {
        skippedCount++;
        continue;
      }

      console.log(`${'  '.repeat(depth + 1)}[${followedCount + 1}/${followers.length}] Stalking: ${follower}`);
      
      const success = await this.followUser(follower);
      if (success) {
        followedCount++;
        currentFollowing.add(follower); // Update our stalking tracking set
        
        // Rate limiting for ambitious stalking mode
        await this.sleep(1500);
        
        // Recursively stalk this user's followers (depth-first stalking)
        const recursiveResult = await this.recursiveStalk(follower, currentFollowing, depth + 1, maxDepth);
        followedCount += recursiveResult.followed;
        skippedCount += recursiveResult.skipped;
      } else {
        skippedCount++;
      }
    }

    console.log(`${'  '.repeat(depth)}📊 ${username} stalking results: ${followedCount} followed, ${skippedCount} skipped`);
    return { followed: followedCount, skipped: skippedCount };
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async run() {
    try {
      await this.init();

      // Get all users you stalk and all your stalkers
      const [following, followers] = await Promise.all([this.getAllFollowing(), this.getAllFollowers()]);

      // Create Sets for faster lookup
      const followingSet = new Set(following);
      const followersSet = new Set(followers);

      // Find stalkers who stalk you but you don't stalk back
      const toFollow = followers.filter((user) => !followingSet.has(user));

      // Find users you stalk who don't stalk you back (one-sided stalking)
      const toUnfollow = following.filter((user) => !followersSet.has(user));

      console.log("📊 Stalking Analysis Results:");
      console.log(`   Currently stalking: ${following.length}`);
      console.log(`   Your stalkers: ${followers.length}`);
      console.log(`   Need to stalk back: ${toFollow.length}`);
      console.log(`   Need to stop one-sided stalking: ${toUnfollow.length}`);
      
      if (this.isAmbitious) {
        console.log(`   🚀 Ambitious stalking: Will recursively stalk followers of ${this.targetUser}`);
      }
      console.log("");

      // Show users to stalk back
      if (toFollow.length > 0) {
        console.log("➕ Users to stalk back (they stalk you, but you don't stalk them):");
        toFollow.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user}`);
        });
        console.log("");
      }

      // Show users to stop stalking
      if (toUnfollow.length > 0) {
        console.log("➖ Users to stop stalking (you stalk them, but they don't stalk you):");
        toUnfollow.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user}`);
        });
        console.log("");
      }

      if (toFollow.length === 0 && toUnfollow.length === 0 && !this.isAmbitious) {
        console.log("🎉 Perfect! You have mutual stalking relationships with everyone.");
        return;
      }

      if (!this.isDryRun) {
        console.log("⚠️  Starting stalking operations in 3 seconds...");
        await this.sleep(3000);
      }

      let followSuccessCount = 0;
      let followFailCount = 0;
      let unfollowSuccessCount = 0;
      let unfollowFailCount = 0;
      let ambitiousStalkCount = 0;
      let ambitiousSkipCount = 0;

      // Stalk back users who stalk you
      if (toFollow.length > 0) {
        console.log("🚀 Stalking back users...\n");
        
        for (let i = 0; i < toFollow.length; i++) {
          const user = toFollow[i];
          console.log(`[${i + 1}/${toFollow.length}] Stalking back: ${user}`);

          const success = await this.followUser(user);
          if (success) {
            followSuccessCount++;
            followingSet.add(user); // Update our stalking tracking set
          } else {
            followFailCount++;
          }

          // Rate limiting
          if (!this.isDryRun && i < toFollow.length - 1) {
            await this.sleep(1000);
          }
        }
        console.log("");
      }

      // Stop stalking users who don't stalk back
      if (toUnfollow.length > 0) {
        console.log("🚀 Stopping one-sided stalking...\n");
        
        for (let i = 0; i < toUnfollow.length; i++) {
          const user = toUnfollow[i];
          console.log(`[${i + 1}/${toUnfollow.length}] Stopping stalking: ${user}`);

          const success = await this.unfollowUser(user);
          if (success) {
            unfollowSuccessCount++;
            followingSet.delete(user); // Update our stalking tracking set
          } else {
            unfollowFailCount++;
          }

          // Rate limiting
          if (!this.isDryRun && i < toUnfollow.length - 1) {
            await this.sleep(1000);
          }
        }
        console.log("");
      }

      // Ambitious recursive stalking
      if (this.isAmbitious && this.targetUser) {
        console.log("🚀 Starting ambitious recursive stalking...\n");
        console.log(`🎯 Primary stalking target: ${this.targetUser}`);
        console.log(`📏 Max stalking depth: ${this.maxDepth} | Max per target: ${this.maxFollowsPerUser}`);
        console.log(`⚠️  This may take a while and use significant API quota...\n`);

        if (!this.isDryRun) {
          console.log("⏳ Starting ambitious stalking mode in 5 seconds...");
          await this.sleep(5000);
        }

        try {
          const ambitiousResult = await this.recursiveStalk(this.targetUser, followingSet);
          ambitiousStalkCount = ambitiousResult.followed;
          ambitiousSkipCount = ambitiousResult.skipped;
        } catch (error) {
          console.log(`❌ Ambitious stalking error: ${error.message}`);
        }
      }

      console.log("📊 Final Stalking Results:");
      console.log(`   ➕ Successfully stalked back: ${followSuccessCount}`);
      console.log(`   ❌ Failed to stalk back: ${followFailCount}`);
      console.log(`   ➖ Successfully stopped stalking: ${unfollowSuccessCount}`);
      console.log(`   ❌ Failed to stop stalking: ${unfollowFailCount}`);
      
      if (this.isAmbitious) {
        console.log(`   🚀 Ambitious stalking follows: ${ambitiousStalkCount}`);
        console.log(`   ⏭️  Ambitious stalking skipped: ${ambitiousSkipCount}`);
        console.log(`   👥 Total stalked users: ${this.processedUsers.size}`);
      }

      if (this.isDryRun) {
        console.log("\n🔍 This was a dry run. To actually start stalking, run:");
        if (this.isAmbitious) {
          console.log(`   node main.js --ambitious ${this.targetUser}`);
        } else {
          console.log("   npm start");
        }
      } else {
        console.log("\n🎉 Stalking operations complete!");
        if (this.isAmbitious) {
          console.log(`💡 Recursively stalked ${ambitiousStalkCount} users from ${this.targetUser}'s network.`);
        } else {
          console.log("💡 You now have mutual stalking relationships with all your connections.");
        }
      }
    } catch (error) {
      console.error("💥 Stalking Error:", error.message);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error("❌ Error: GITHUB_TOKEN environment variable is required");
    console.log("\n📝 Stalk Setup Instructions:");
    console.log("1. Copy .env.example to .env");
    console.log("2. Get a GitHub Personal Access Token from: https://github.com/settings/tokens");
    console.log("3. Add the token to your .env file");
    console.log('4. Make sure the token has "user:follow" scope');
    console.log("\n🚀 Stalk Usage:");
    console.log("   npm start                           # Normal mutual stalking mode");
    console.log("   npm run dry-run                     # Preview stalking strategy");
    console.log("   node main.js --ambitious username   # Recursive stalking mode");
    console.log("   node main.js -a username            # Short form ambitious stalking");
    console.log("\n🕵️ Repository: https://github.com/oluiscabral/stalk");
    process.exit(1);
  }

  const stalkManager = new StalkManager(token);
  await stalkManager.run();
}

main().catch(console.error);
