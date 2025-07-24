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
    this.dfsStats = { totalProcessed: 0, totalFollowed: 0, maxDepthReached: 0 };
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
      console.log("🕵️ Stalk - Social Tracking & Auto-Link Kit");
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
        console.log(`🚀 AMBITIOUS STALKING MODE ENABLED - Will use DFS to recursively stalk followers of: ${this.targetUser}`);
        console.log(`🌳 DFS Algorithm: Depth-First Search traversal for maximum stalking efficiency`);
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

  /**
   * DFS (Depth-First Search) Stalking Algorithm
   * 
   * This implements a true depth-first traversal where we:
   * 1. Visit a user (follow them)
   * 2. Immediately explore their followers deeply (recursively)
   * 3. Only move to the next sibling after fully exploring the current branch
   * 
   * DFS ensures we exhaust each stalking path completely before backtracking
   */
  async dfsStalk(username, currentFollowing, depth = 0, maxDepth = this.maxDepth, path = []) {
    // Update DFS statistics
    this.dfsStats.totalProcessed++;
    this.dfsStats.maxDepthReached = Math.max(this.dfsStats.maxDepthReached, depth);

    // Base cases for DFS termination
    if (depth >= maxDepth) {
      console.log(`   🛑 DFS: Max stalking depth (${maxDepth}) reached for ${username}`);
      return { followed: 0, skipped: 0 };
    }

    if (this.processedUsers.has(username)) {
      console.log(`   🔄 DFS: Already processed ${username}, skipping to avoid stalking cycles`);
      return { followed: 0, skipped: 0 };
    }

    // Mark as processed to prevent cycles
    this.processedUsers.add(username);
    
    // DFS Path visualization
    const pathStr = path.length > 0 ? ` (path: ${path.join(' → ')} → ${username})` : '';
    console.log(`\n${'  '.repeat(depth)}🌳 DFS: Processing ${username} at depth ${depth}${pathStr}`);
    
    // Get stalking targets from this user
    const followers = await this.getUserFollowers(username);
    
    let followedCount = 0;
    let skippedCount = 0;

    // DFS: Process each follower completely before moving to the next
    for (let i = 0; i < followers.length; i++) {
      const follower = followers[i];
      
      // Skip if it's ourselves (no self-stalking)
      if (follower === this.username) {
        console.log(`${'  '.repeat(depth + 1)}⏭️  DFS: Skipping self (${follower})`);
        continue;
      }

      // Skip if we already stalk them or stalked them in this session
      if (currentFollowing.has(follower) || this.followedInSession.has(follower)) {
        console.log(`${'  '.repeat(depth + 1)}⏭️  DFS: Already stalking ${follower}, skipping`);
        skippedCount++;
        continue;
      }

      console.log(`${'  '.repeat(depth + 1)}🎯 DFS: [${i + 1}/${followers.length}] Stalking: ${follower}`);
      
      // Follow the user (visit the node)
      const success = await this.followUser(follower);
      if (success) {
        followedCount++;
        this.dfsStats.totalFollowed++;
        currentFollowing.add(follower); // Update our stalking tracking set
        
        // Rate limiting for DFS stalking mode
        await this.sleep(1500);
        
        // DFS: IMMEDIATELY explore this user's followers deeply before moving to next sibling
        console.log(`${'  '.repeat(depth + 1)}🌳 DFS: Diving deeper into ${follower}'s network...`);
        const newPath = [...path, username];
        const recursiveResult = await this.dfsStalk(follower, currentFollowing, depth + 1, maxDepth, newPath);
        
        followedCount += recursiveResult.followed;
        skippedCount += recursiveResult.skipped;
        
        console.log(`${'  '.repeat(depth + 1)}🔙 DFS: Backtracking from ${follower} (followed: ${recursiveResult.followed}, skipped: ${recursiveResult.skipped})`);
      } else {
        console.log(`${'  '.repeat(depth + 1)}❌ DFS: Failed to stalk ${follower}, continuing DFS traversal`);
        skippedCount++;
      }
    }

    console.log(`${'  '.repeat(depth)}📊 DFS: ${username} complete - followed: ${followedCount}, skipped: ${skippedCount} (depth: ${depth})`);
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
        console.log(`   🌳 DFS stalking: Will use Depth-First Search to recursively stalk followers of ${this.targetUser}`);
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
      let dfsStalkCount = 0;
      let dfsSkipCount = 0;

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

      // DFS Ambitious recursive stalking
      if (this.isAmbitious && this.targetUser) {
        console.log("🌳 Starting DFS (Depth-First Search) ambitious stalking...\n");
        console.log(`🎯 DFS Root Node: ${this.targetUser}`);
        console.log(`📏 DFS Parameters: Max depth: ${this.maxDepth} | Max per node: ${this.maxFollowsPerUser}`);
        console.log(`🧠 DFS Algorithm: Will explore each stalking path completely before backtracking`);
        console.log(`⚠️  This may take a while and use significant API quota...\n`);

        if (!this.isDryRun) {
          console.log("⏳ Starting DFS stalking mode in 5 seconds...");
          await this.sleep(5000);
        }

        // Reset DFS statistics
        this.dfsStats = { totalProcessed: 0, totalFollowed: 0, maxDepthReached: 0 };

        try {
          console.log("🌳 DFS: Beginning depth-first traversal from root node...\n");
          const dfsResult = await this.dfsStalk(this.targetUser, followingSet);
          dfsStalkCount = dfsResult.followed;
          dfsSkipCount = dfsResult.skipped;
          
          console.log("\n🌳 DFS Traversal Complete!");
          console.log(`📊 DFS Statistics:`);
          console.log(`   🔍 Total nodes processed: ${this.dfsStats.totalProcessed}`);
          console.log(`   ✅ Total users followed: ${this.dfsStats.totalFollowed}`);
          console.log(`   📏 Maximum depth reached: ${this.dfsStats.maxDepthReached}`);
          console.log(`   🌳 DFS paths explored: ${this.processedUsers.size}`);
        } catch (error) {
          console.log(`❌ DFS stalking error: ${error.message}`);
        }
      }

      console.log("📊 Final Stalking Results:");
      console.log(`   ➕ Successfully stalked back: ${followSuccessCount}`);
      console.log(`   ❌ Failed to stalk back: ${followFailCount}`);
      console.log(`   ➖ Successfully stopped stalking: ${unfollowSuccessCount}`);
      console.log(`   ❌ Failed to stop stalking: ${unfollowFailCount}`);
      
      if (this.isAmbitious) {
        console.log(`   🌳 DFS stalking follows: ${dfsStalkCount}`);
        console.log(`   ⏭️  DFS stalking skipped: ${dfsSkipCount}`);
        console.log(`   🔍 Total DFS nodes processed: ${this.dfsStats.totalProcessed}`);
        console.log(`   📏 Maximum DFS depth reached: ${this.dfsStats.maxDepthReached}`);
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
          console.log(`💡 Used DFS algorithm to recursively stalk ${dfsStalkCount} users from ${this.targetUser}'s network.`);
          console.log(`🌳 DFS explored ${this.dfsStats.totalProcessed} nodes with maximum depth of ${this.dfsStats.maxDepthReached}.`);
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
    console.log("   node main.js --ambitious username   # DFS recursive stalking mode");
    console.log("   node main.js -a username            # Short form DFS ambitious stalking");
    console.log("\n🕵️ Repository: https://github.com/oluiscabral/stalk");
    process.exit(1);
  }

  const stalkManager = new StalkManager(token);
  await stalkManager.run();
}

main().catch(console.error);
