import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

class GitHubMutualFollowManager {
  constructor(token) {
    if (!token) {
      throw new Error("GitHub token is required. Please set GITHUB_TOKEN in your .env file");
    }

    this.octokit = new Octokit({
      auth: token,
    });

    this.username = null;
    this.isDryRun = process.argv.includes("--dry-run");
  }

  async init() {
    try {
      // Get authenticated user info
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      this.username = user.login;
      console.log(`🔐 Authenticated as: ${this.username}`);
      console.log(`📊 Public repos: ${user.public_repos} | Followers: ${user.followers} | Following: ${user.following}`);

      if (this.isDryRun) {
        console.log("🔍 DRY RUN MODE - No actual following/unfollowing will occur\n");
      } else {
        console.log("⚠️  LIVE MODE - Users will be followed/unfollowed\n");
      }
    } catch (error) {
      throw new Error(`Failed to authenticate: ${error.message}`);
    }
  }

  async getAllFollowing() {
    console.log("📋 Fetching users you follow...");
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

    console.log(`✅ Total following: ${following.length}\n`);
    return following;
  }

  async getAllFollowers() {
    console.log("👥 Fetching your followers...");
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
        console.log(`   📄 Page ${page}: ${data.length} followers`);
        page++;

        // Rate limiting protection
        await this.sleep(100);
      } catch (error) {
        throw new Error(`Failed to fetch followers list: ${error.message}`);
      }
    }

    console.log(`✅ Total followers: ${followers.length}\n`);
    return followers;
  }

  async followUser(username) {
    try {
      if (this.isDryRun) {
        console.log(`   🔍 [DRY RUN] Would follow: ${username}`);
        return true;
      }

      await this.octokit.rest.users.follow({
        username: username,
      });

      console.log(`   ✅ Followed: ${username}`);
      return true;
    } catch (error) {
      console.log(`   ❌ Failed to follow ${username}: ${error.message}`);
      return false;
    }
  }

  async unfollowUser(username) {
    try {
      if (this.isDryRun) {
        console.log(`   🔍 [DRY RUN] Would unfollow: ${username}`);
        return true;
      }

      await this.octokit.rest.users.unfollow({
        username: username,
      });

      console.log(`   ✅ Unfollowed: ${username}`);
      return true;
    } catch (error) {
      console.log(`   ❌ Failed to unfollow ${username}: ${error.message}`);
      return false;
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async run() {
    try {
      await this.init();

      // Get all users you follow and all your followers
      const [following, followers] = await Promise.all([this.getAllFollowing(), this.getAllFollowers()]);

      // Create Sets for faster lookup
      const followingSet = new Set(following);
      const followersSet = new Set(followers);

      // Find users who follow you but you don't follow back
      const toFollow = followers.filter((user) => !followingSet.has(user));

      // Find users you follow who don't follow you back
      const toUnfollow = following.filter((user) => !followersSet.has(user));

      console.log("📊 Analysis Results:");
      console.log(`   Following: ${following.length}`);
      console.log(`   Followers: ${followers.length}`);
      console.log(`   Need to follow back: ${toFollow.length}`);
      console.log(`   Need to unfollow: ${toUnfollow.length}\n`);

      // Show users to follow back
      if (toFollow.length > 0) {
        console.log("➕ Users to follow back (they follow you, but you don't follow them):");
        toFollow.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user}`);
        });
        console.log("");
      }

      // Show users to unfollow
      if (toUnfollow.length > 0) {
        console.log("➖ Users to unfollow (you follow them, but they don't follow you):");
        toUnfollow.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user}`);
        });
        console.log("");
      }

      if (toFollow.length === 0 && toUnfollow.length === 0) {
        console.log("🎉 Perfect! You have mutual following with everyone.");
        return;
      }

      if (!this.isDryRun) {
        console.log("⚠️  Starting mutual follow management in 3 seconds...");
        await this.sleep(3000);
      }

      let followSuccessCount = 0;
      let followFailCount = 0;
      let unfollowSuccessCount = 0;
      let unfollowFailCount = 0;

      // Follow back users who follow you
      if (toFollow.length > 0) {
        console.log("🚀 Following back users...\n");
        
        for (let i = 0; i < toFollow.length; i++) {
          const user = toFollow[i];
          console.log(`[${i + 1}/${toFollow.length}] Following back: ${user}`);

          const success = await this.followUser(user);
          if (success) {
            followSuccessCount++;
          } else {
            followFailCount++;
          }

          // Rate limiting: GitHub allows 5000 requests per hour
          // Being conservative with 1 second delay
          if (!this.isDryRun && i < toFollow.length - 1) {
            await this.sleep(1000);
          }
        }
        console.log("");
      }

      // Unfollow users who don't follow back
      if (toUnfollow.length > 0) {
        console.log("🚀 Unfollowing non-followers...\n");
        
        for (let i = 0; i < toUnfollow.length; i++) {
          const user = toUnfollow[i];
          console.log(`[${i + 1}/${toUnfollow.length}] Unfollowing: ${user}`);

          const success = await this.unfollowUser(user);
          if (success) {
            unfollowSuccessCount++;
          } else {
            unfollowFailCount++;
          }

          // Rate limiting protection
          if (!this.isDryRun && i < toUnfollow.length - 1) {
            await this.sleep(1000);
          }
        }
        console.log("");
      }

      console.log("📊 Final Results:");
      console.log(`   ➕ Successfully followed back: ${followSuccessCount}`);
      console.log(`   ❌ Failed to follow: ${followFailCount}`);
      console.log(`   ➖ Successfully unfollowed: ${unfollowSuccessCount}`);
      console.log(`   ❌ Failed to unfollow: ${unfollowFailCount}`);

      if (this.isDryRun) {
        console.log("\n🔍 This was a dry run. To actually follow/unfollow users, run:");
        console.log("   npm start");
      } else {
        console.log("\n🎉 Mutual follow management complete!");
        console.log("💡 You now have mutual following relationships with all your connections.");
      }
    } catch (error) {
      console.error("💥 Error:", error.message);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error("❌ Error: GITHUB_TOKEN environment variable is required");
    console.log("\n📝 Setup instructions:");
    console.log("1. Copy .env.example to .env");
    console.log("2. Get a GitHub Personal Access Token from: https://github.com/settings/tokens");
    console.log("3. Add the token to your .env file");
    console.log('4. Make sure the token has "user:follow" scope');
    process.exit(1);
  }

  const followManager = new GitHubMutualFollowManager(token);
  await followManager.run();
}

main().catch(console.error);
