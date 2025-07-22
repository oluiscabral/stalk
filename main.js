import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

class GitHubUnfollower {
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
        console.log("🔍 DRY RUN MODE - No actual unfollowing will occur\n");
      } else {
        console.log("⚠️  LIVE MODE - Users will be unfollowed\n");
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

      // Create a Set of followers for faster lookup
      const followersSet = new Set(followers);

      // Find users you follow who don't follow you back
      const nonFollowBacks = following.filter((user) => !followersSet.has(user));

      console.log("📊 Analysis Results:");
      console.log(`   Following: ${following.length}`);
      console.log(`   Followers: ${followers.length}`);
      console.log(`   Non-follow backs: ${nonFollowBacks.length}\n`);

      if (nonFollowBacks.length === 0) {
        console.log("🎉 Great! Everyone you follow also follows you back.");
        return;
      }

      console.log("👥 Users who don't follow you back:");
      nonFollowBacks.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user}`);
      });
      console.log("");

      if (!this.isDryRun) {
        console.log("⚠️  Starting to unfollow in 3 seconds...");
        await this.sleep(3000);
      }

      console.log("🚀 Processing unfollows...\n");

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < nonFollowBacks.length; i++) {
        const user = nonFollowBacks[i];
        console.log(`[${i + 1}/${nonFollowBacks.length}] Processing: ${user}`);

        const success = await this.unfollowUser(user);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }

        // Rate limiting: GitHub allows 5000 requests per hour
        // Being conservative with 1 second delay
        if (!this.isDryRun && i < nonFollowBacks.length - 1) {
          await this.sleep(1000);
        }
      }

      console.log("\n📊 Final Results:");
      console.log(`   ✅ Successfully processed: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}`);

      if (this.isDryRun) {
        console.log("\n🔍 This was a dry run. To actually unfollow users, run:");
        console.log("   npm start");
      } else {
        console.log("\n🎉 Unfollowing complete!");
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

  const unfollower = new GitHubUnfollower(token);
  await unfollower.run();
}

main().catch(console.error);
