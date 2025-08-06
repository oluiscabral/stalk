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
    
    // Parse configurable parameters with infinite defaults
    this.maxDepth = this.parseMaxDepth();
    this.maxFollowsPerUser = this.parseMaxFollows();
    
    // Parse optional operation controls
    this.skipFollowBack = process.argv.includes("--skip-follow-back");
    this.skipUnfollow = process.argv.includes("--skip-unfollow");
    
    this.bfsStats = { totalProcessed: 0, totalFollowed: 0, maxDepthReached: 0, levelsProcessed: 0 };
  }

  getTargetUser() {
    const args = process.argv;
    const ambitiousIndex = args.findIndex(arg => arg === "--ambitious" || arg === "-a");
    
    if (ambitiousIndex !== -1 && ambitiousIndex + 1 < args.length) {
      const nextArg = args[ambitiousIndex + 1];
      // Make sure the next argument is not another flag
      if (!nextArg.startsWith('--')) {
        return nextArg;
      }
    }
    
    return null;
  }

  parseMaxDepth() {
    const args = process.argv;
    const depthIndex = args.findIndex(arg => arg === "--max-depth");
    
    if (depthIndex !== -1 && depthIndex + 1 < args.length) {
      const depthValue = args[depthIndex + 1];
      const parsed = parseInt(depthValue, 10);
      
      if (isNaN(parsed) || parsed < 1) {
        throw new Error(`Invalid --max-depth value: ${depthValue}. Must be a positive integer.`);
      }
      
      return parsed;
    }
    
    // Default to infinite depth
    return Infinity;
  }

  parseMaxFollows() {
    const args = process.argv;
    const followsIndex = args.findIndex(arg => arg === "--max-follows");
    
    if (followsIndex !== -1 && followsIndex + 1 < args.length) {
      const followsValue = args[followsIndex + 1];
      const parsed = parseInt(followsValue, 10);
      
      if (isNaN(parsed) || parsed < 1) {
        throw new Error(`Invalid --max-follows value: ${followsValue}. Must be a positive integer.`);
      }
      
      return parsed;
    }
    
    // Default to infinite follows per user
    return Infinity;
  }

  formatInfiniteValue(value) {
    return value === Infinity ? "∞ (infinite)" : value.toString();
  }

  async init() {
    try {
      // Get authenticated user info
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      this.username = user.login;
      console.log("🕵️ Stalk v1.0.9 - Social Tracking & Auto-Link Kit");
      console.log(`🔐 Authenticated as: ${this.username}`);
      console.log(`📊 Public repos: ${user.public_repos} | Followers: ${user.followers} | Following: ${user.following}`);

      if (this.isDryRun) {
        console.log("🔍 DRY RUN MODE - No actual stalking will occur (just planning)");
      } else {
        console.log("⚠️  LIVE STALKING MODE - Users will be followed/unfollowed");
      }

      // Display optional operation controls
      if (this.skipFollowBack || this.skipUnfollow) {
        console.log("🎛️  OPTIONAL OPERATIONS:");
        if (this.skipFollowBack) {
          console.log("   ⏭️  Following back: DISABLED (will skip mutual stalking)");
        }
        if (this.skipUnfollow) {
          console.log("   ⏭️  Unfollowing: DISABLED (will skip stopping one-sided stalking)");
        }
      }

      if (this.isAmbitious) {
        if (!this.targetUser) {
          throw new Error("Ambitious stalking mode requires a target username. Usage: --ambitious [username] or -a [username]");
        }
        console.log(`🚀 AMBITIOUS STALKING MODE ENABLED - Will use BFS to recursively stalk followers of: ${this.targetUser}`);
        console.log(`🌊 BFS Algorithm: Breadth-First Search traversal for level-by-level stalking efficiency`);
        console.log(`📏 Max stalking depth: ${this.formatInfiniteValue(this.maxDepth)} levels`);
        console.log(`👥 Max follows per target: ${this.formatInfiniteValue(this.maxFollowsPerUser)} followers`);
        
        if (this.maxDepth === Infinity && this.maxFollowsPerUser === Infinity) {
          console.log(`⚠️  WARNING: Both depth and follows are infinite - this could run for a VERY long time!`);
        }
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
    // Handle infinite limit
    const effectiveLimit = limit === Infinity ? Number.MAX_SAFE_INTEGER : limit;
    const limitDisplay = limit === Infinity ? "∞" : limit;
    
    console.log(`🔍 Fetching stalking targets from: ${username} (limit: ${limitDisplay})`);
    const followers = [];
    let page = 1;
    let fetched = 0;

    while (fetched < effectiveLimit) {
      try {
        const perPage = Math.min(100, effectiveLimit - fetched);
        const { data } = await this.octokit.rest.users.listFollowersForUser({
          username: username,
          per_page: perPage,
          page: page,
        });

        if (data.length === 0) break;

        const usernames = data.map((user) => user.login);
        followers.push(...usernames);
        fetched += data.length;
        
        console.log(`   📄 Page ${page}: ${data.length} stalking targets (${fetched}/${limitDisplay})`);
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
   * BFS (Breadth-First Search) Stalking Algorithm
   * 
   * This implements a true breadth-first traversal where we:
   * 1. Process all users at the current level completely
   * 2. Add their followers to the queue for the next level
   * 3. Move to the next level only after current level is complete
   * 
   * BFS ensures we explore the stalking network level by level,
   * following users in order of their distance from the root target.
   * Now supports configurable infinite depth and follows per user!
   */
  async bfsStalk(rootUsername, currentFollowing, maxDepth = this.maxDepth) {
    // Initialize BFS queue with root user at depth 0
    const queue = [{ username: rootUsername, depth: 0, parent: null }];
    
    // Reset BFS statistics
    this.bfsStats = { totalProcessed: 0, totalFollowed: 0, maxDepthReached: 0, levelsProcessed: 0 };
    
    let totalFollowed = 0;
    let totalSkipped = 0;
    let currentLevel = 0;
    let usersInCurrentLevel = 1; // Root user
    let usersInNextLevel = 0;

    console.log(`🌊 BFS: Starting breadth-first traversal from root: ${rootUsername}`);
    console.log(`📏 BFS Parameters: Max depth: ${this.formatInfiniteValue(maxDepth)} | Max per node: ${this.formatInfiniteValue(this.maxFollowsPerUser)}`);
    console.log(`🧠 BFS Algorithm: Will explore each level completely before moving to next level\n`);

    while (queue.length > 0) {
      const { username, depth, parent } = queue.shift();
      
      // Update BFS statistics
      this.bfsStats.totalProcessed++;
      this.bfsStats.maxDepthReached = Math.max(this.bfsStats.maxDepthReached, depth);

      // Check if we've moved to a new level
      if (depth > currentLevel) {
        console.log(`\n🌊 BFS: Completed level ${currentLevel} (${usersInCurrentLevel} users processed)`);
        console.log(`🌊 BFS: Moving to level ${depth} (${usersInNextLevel} users queued)`);
        this.bfsStats.levelsProcessed++;
        currentLevel = depth;
        usersInCurrentLevel = usersInNextLevel;
        usersInNextLevel = 0;
      }

      // Base case for BFS termination (handle infinite depth)
      if (maxDepth !== Infinity && depth >= maxDepth) {
        console.log(`   🛑 BFS: Max stalking depth (${maxDepth}) reached for ${username}`);
        continue;
      }

      if (this.processedUsers.has(username)) {
        console.log(`   🔄 BFS: Already processed ${username}, skipping to avoid stalking cycles`);
        usersInCurrentLevel--;
        continue;
      }

      // Mark as processed to prevent cycles
      this.processedUsers.add(username);
      
      // BFS Level and parent visualization
      const parentStr = parent ? ` (parent: ${parent})` : ' (root)';
      const depthDisplay = maxDepth === Infinity ? `${depth}/∞` : `${depth}/${maxDepth}`;
      console.log(`\n${'  '.repeat(depth)}🌊 BFS: Processing ${username} at level ${depthDisplay}${parentStr}`);
      
      // Get stalking targets from this user
      const followers = await this.getUserFollowers(username);
      
      let levelFollowed = 0;
      let levelSkipped = 0;

      // BFS: Process all followers at this level, add valid ones to queue for next level
      for (let i = 0; i < followers.length; i++) {
        const follower = followers[i];
        
        // Skip if it's ourselves (no self-stalking)
        if (follower === this.username) {
          console.log(`${'  '.repeat(depth + 1)}⏭️  BFS: Skipping self (${follower})`);
          continue;
        }

        // Skip if we already stalk them or stalked them in this session
        if (currentFollowing.has(follower) || this.followedInSession.has(follower)) {
          console.log(`${'  '.repeat(depth + 1)}⏭️  BFS: Already stalking ${follower}, skipping`);
          levelSkipped++;
          totalSkipped++;
          continue;
        }

        // Skip if already processed or in queue to avoid cycles
        if (this.processedUsers.has(follower)) {
          console.log(`${'  '.repeat(depth + 1)}🔄 BFS: ${follower} already processed, skipping cycle`);
          levelSkipped++;
          totalSkipped++;
          continue;
        }

        console.log(`${'  '.repeat(depth + 1)}🎯 BFS: [${i + 1}/${followers.length}] Stalking: ${follower}`);
        
        // Follow the user (visit the node)
        const success = await this.followUser(follower);
        if (success) {
          levelFollowed++;
          totalFollowed++;
          this.bfsStats.totalFollowed++;
          currentFollowing.add(follower); // Update our stalking tracking set
          
          // BFS: Add follower to queue for next level processing (if within depth limit)
          if (maxDepth === Infinity || depth + 1 < maxDepth) {
            queue.push({ username: follower, depth: depth + 1, parent: username });
            usersInNextLevel++;
            console.log(`${'  '.repeat(depth + 1)}📋 BFS: Queued ${follower} for level ${depth + 1} processing`);
          } else {
            console.log(`${'  '.repeat(depth + 1)}🛑 BFS: ${follower} not queued (would exceed max depth)`);
          }
          
          // Rate limiting for BFS stalking mode
          await this.sleep(1500);
        } else {
          console.log(`${'  '.repeat(depth + 1)}❌ BFS: Failed to stalk ${follower}, continuing BFS traversal`);
          levelSkipped++;
          totalSkipped++;
        }
      }

      usersInCurrentLevel--;
      const depthInfo = maxDepth === Infinity ? `level: ${depth}` : `level: ${depth}/${maxDepth}`;
      console.log(`${'  '.repeat(depth)}📊 BFS: ${username} complete - followed: ${levelFollowed}, skipped: ${levelSkipped} (${depthInfo})`);
      console.log(`${'  '.repeat(depth)}📋 BFS: Queue size: ${queue.length}, Next level users: ${usersInNextLevel}`);
    }

    // Final level completion message
    if (currentLevel >= 0) {
      console.log(`\n🌊 BFS: Completed final level ${currentLevel}`);
      this.bfsStats.levelsProcessed++;
    }

    console.log(`\n🌊 BFS: Breadth-first traversal complete!`);
    console.log(`📊 BFS Level-by-Level Summary:`);
    console.log(`   🔍 Total nodes processed: ${this.bfsStats.totalProcessed}`);
    console.log(`   ✅ Total users followed: ${this.bfsStats.totalFollowed}`);
    console.log(`   📏 Maximum level reached: ${this.bfsStats.maxDepthReached}${maxDepth === Infinity ? ' (infinite limit)' : `/${maxDepth}`}`);
    console.log(`   🌊 Total levels processed: ${this.bfsStats.levelsProcessed}`);
    console.log(`   📋 Unique users explored: ${this.processedUsers.size}`);

    return { followed: totalFollowed, skipped: totalSkipped };
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
      console.log(`   Need to stalk back: ${toFollow.length}${this.skipFollowBack ? ' (SKIPPED)' : ''}`);
      console.log(`   Need to stop one-sided stalking: ${toUnfollow.length}${this.skipUnfollow ? ' (SKIPPED)' : ''}`);
      
      if (this.isAmbitious) {
        console.log(`   🌊 BFS stalking: Will use Breadth-First Search to level-by-level stalk followers of ${this.targetUser}`);
        console.log(`   📏 BFS depth limit: ${this.formatInfiniteValue(this.maxDepth)}`);
        console.log(`   👥 BFS follows per user: ${this.formatInfiniteValue(this.maxFollowsPerUser)}`);
      }
      console.log("");

      // Show users to stalk back (only if not skipped)
      if (toFollow.length > 0 && !this.skipFollowBack) {
        console.log("➕ Users to stalk back (they stalk you, but you don't stalk them):");
        toFollow.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user}`);
        });
        console.log("");
      } else if (toFollow.length > 0 && this.skipFollowBack) {
        console.log("⏭️  Skipping following back operations (--skip-follow-back enabled)");
        console.log(`   Would have stalked back ${toFollow.length} users: ${toFollow.slice(0, 5).join(', ')}${toFollow.length > 5 ? '...' : ''}`);
        console.log("");
      }

      // Show users to stop stalking (only if not skipped)
      if (toUnfollow.length > 0 && !this.skipUnfollow) {
        console.log("➖ Users to stop stalking (you stalk them, but they don't stalk you):");
        toUnfollow.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user}`);
        });
        console.log("");
      } else if (toUnfollow.length > 0 && this.skipUnfollow) {
        console.log("⏭️  Skipping unfollowing operations (--skip-unfollow enabled)");
        console.log(`   Would have stopped stalking ${toUnfollow.length} users: ${toUnfollow.slice(0, 5).join(', ')}${toUnfollow.length > 5 ? '...' : ''}`);
        console.log("");
      }

      if (toFollow.length === 0 && toUnfollow.length === 0 && !this.isAmbitious) {
        console.log("🎉 Perfect! You have mutual stalking relationships with everyone.");
        return;
      }

      // Check if all operations are skipped
      const followBackSkipped = this.skipFollowBack || toFollow.length === 0;
      const unfollowSkipped = this.skipUnfollow || toUnfollow.length === 0;
      
      if (followBackSkipped && unfollowSkipped && !this.isAmbitious) {
        console.log("⏭️  All mutual stalking operations are skipped or not needed.");
        console.log("💡 Use --ambitious [username] for BFS recursive stalking, or remove skip flags for mutual stalking.");
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
      let bfsStalkCount = 0;
      let bfsSkipCount = 0;

      // Stalk back users who stalk you (only if not skipped)
      if (toFollow.length > 0 && !this.skipFollowBack) {
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

      // Stop stalking users who don't stalk back (only if not skipped)
      if (toUnfollow.length > 0 && !this.skipUnfollow) {
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

      // BFS Ambitious recursive stalking
      if (this.isAmbitious && this.targetUser) {
        console.log("🌊 Starting BFS (Breadth-First Search) ambitious stalking...\n");
        console.log(`🎯 BFS Root Node: ${this.targetUser}`);
        console.log(`📏 BFS Parameters: Max depth: ${this.formatInfiniteValue(this.maxDepth)} | Max per node: ${this.formatInfiniteValue(this.maxFollowsPerUser)}`);
        console.log(`🧠 BFS Algorithm: Will explore each level completely before moving to next level`);
        
        if (this.maxDepth === Infinity || this.maxFollowsPerUser === Infinity) {
          console.log(`⚠️  WARNING: Infinite parameters detected - this could run for a VERY long time and use massive API quota!`);
        } else {
          console.log(`⚠️  This may take a while and use significant API quota...`);
        }
        console.log("");

        if (!this.isDryRun) {
          console.log("⏳ Starting BFS stalking mode in 5 seconds...");
          await this.sleep(5000);
        }

        try {
          console.log("🌊 BFS: Beginning breadth-first traversal from root node...\n");
          const bfsResult = await this.bfsStalk(this.targetUser, followingSet);
          bfsStalkCount = bfsResult.followed;
          bfsSkipCount = bfsResult.skipped;
          
          console.log("\n🌊 BFS Traversal Complete!");
          console.log(`📊 BFS Statistics:`);
          console.log(`   🔍 Total nodes processed: ${this.bfsStats.totalProcessed}`);
          console.log(`   ✅ Total users followed: ${this.bfsStats.totalFollowed}`);
          console.log(`   📏 Maximum level reached: ${this.bfsStats.maxDepthReached}${this.maxDepth === Infinity ? ' (infinite limit)' : `/${this.maxDepth}`}`);
          console.log(`   🌊 Total levels processed: ${this.bfsStats.levelsProcessed}`);
          console.log(`   📋 Unique users explored: ${this.processedUsers.size}`);
        } catch (error) {
          console.log(`❌ BFS stalking error: ${error.message}`);
        }
      }

      console.log("📊 Final Stalking Results:");
      if (!this.skipFollowBack) {
        console.log(`   ➕ Successfully stalked back: ${followSuccessCount}`);
        console.log(`   ❌ Failed to stalk back: ${followFailCount}`);
      } else {
        console.log(`   ⏭️  Following back: SKIPPED (${toFollow.length} users)`);
      }
      
      if (!this.skipUnfollow) {
        console.log(`   ➖ Successfully stopped stalking: ${unfollowSuccessCount}`);
        console.log(`   ❌ Failed to stop stalking: ${unfollowFailCount}`);
      } else {
        console.log(`   ⏭️  Unfollowing: SKIPPED (${toUnfollow.length} users)`);
      }
      
      if (this.isAmbitious) {
        console.log(`   🌊 BFS stalking follows: ${bfsStalkCount}`);
        console.log(`   ⏭️  BFS stalking skipped: ${bfsSkipCount}`);
        console.log(`   🔍 Total BFS nodes processed: ${this.bfsStats.totalProcessed}`);
        console.log(`   📏 Maximum BFS level reached: ${this.bfsStats.maxDepthReached}`);
        console.log(`   🌊 Total BFS levels processed: ${this.bfsStats.levelsProcessed}`);
      }

      if (this.isDryRun) {
        console.log("\n🔍 This was a dry run. To actually start stalking, run:");
        if (this.isAmbitious) {
          const skipFlags = [];
          if (this.skipFollowBack) skipFlags.push('--skip-follow-back');
          if (this.skipUnfollow) skipFlags.push('--skip-unfollow');
          const depthFlag = this.maxDepth !== Infinity ? ` --max-depth ${this.maxDepth}` : '';
          const followsFlag = this.maxFollowsPerUser !== Infinity ? ` --max-follows ${this.maxFollowsPerUser}` : '';
          const skipFlagsStr = skipFlags.length > 0 ? ` ${skipFlags.join(' ')}` : '';
          console.log(`   node main.js --ambitious ${this.targetUser}${depthFlag}${followsFlag}${skipFlagsStr}`);
        } else {
          const skipFlags = [];
          if (this.skipFollowBack) skipFlags.push('--skip-follow-back');
          if (this.skipUnfollow) skipFlags.push('--skip-unfollow');
          const skipFlagsStr = skipFlags.length > 0 ? ` ${skipFlags.join(' ')}` : '';
          console.log(`   npm start${skipFlagsStr}`);
        }
      } else {
        console.log("\n🎉 Stalking operations complete!");
        if (this.isAmbitious) {
          console.log(`💡 Used BFS algorithm to level-by-level stalk ${bfsStalkCount} users from ${this.targetUser}'s network.`);
          console.log(`🌊 BFS explored ${this.bfsStats.totalProcessed} nodes across ${this.bfsStats.levelsProcessed} levels with maximum depth of ${this.bfsStats.maxDepthReached}.`);
        } else {
          const operations = [];
          if (!this.skipFollowBack && followSuccessCount > 0) operations.push(`followed back ${followSuccessCount} users`);
          if (!this.skipUnfollow && unfollowSuccessCount > 0) operations.push(`stopped stalking ${unfollowSuccessCount} users`);
          if (operations.length > 0) {
            console.log(`💡 Successfully ${operations.join(' and ')}.`);
          } else {
            console.log("💡 No stalking operations were performed (all skipped or not needed).");
          }
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
    console.log("   npm start                                    # Normal mutual stalking mode");
    console.log("   npm run dry-run                              # Preview stalking strategy");
    console.log("   npm run follow                               # Follow back only");
    console.log("   npm run unfollow                             # Unfollow non-followers only");
    console.log("   npm run dry-run:follow                       # Preview follow back only");
    console.log("   npm run dry-run:unfollow                     # Preview unfollow non-followers only");
    console.log("   node main.js --follow-only                   # Follow back only");
    console.log("   node main.js --unfollow-only                 # Unfollow non-followers only");
    console.log("   node main.js --skip-follow-back              # Skip following back, only unfollow");
    console.log("   node main.js --skip-unfollow                 # Skip unfollowing, only follow back");
    console.log("   node main.js --skip-follow-back --skip-unfollow  # Skip both (analysis only)");
    console.log("   node main.js --ambitious username            # BFS recursive stalking mode (infinite depth & follows)");
    console.log("   node main.js -a username                     # Short form BFS ambitious stalking");
    console.log("   node main.js -a username --max-depth 5       # BFS with depth limit of 5");
    console.log("   node main.js -a username --max-follows 100   # BFS with 100 follows per user limit");
    console.log("   node main.js -a username --max-depth 3 --max-follows 50  # BFS with both limits");
    console.log("   node main.js -a username --skip-follow-back  # BFS only, skip mutual stalking");
    console.log("\n🎛️  Optional Operation Controls:");
    console.log("   --follow-only         # Only follow back users who follow you");
    console.log("   --unfollow-only       # Only unfollow users who don't follow back");
    console.log("   --skip-follow-back    # Skip following back users who follow you");
    console.log("   --skip-unfollow       # Skip unfollowing users who don't follow back");
    console.log("\n🌊 BFS Parameters:");
    console.log("   --max-depth N     # Maximum stalking depth (default: infinite ∞)");
    console.log("   --max-follows N   # Maximum followers to stalk per user (default: infinite ∞)");
    console.log("\n🕵️ Repository: https://github.com/oluiscabral/stalk");
    process.exit(1);
  }

  const stalkManager = new StalkManager(token);
  await stalkManager.run();
}

main().catch(console.error);
