const fs = require("fs");
const path = require("path");

// Function to parse frontmatter from markdown files
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  const frontmatter = match[1];
  const metadata = {};

  // Parse each line of frontmatter
  frontmatter.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      // Handle arrays (tags)
      if (value.startsWith("[") && value.endsWith("]")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim().replace(/"/g, ""));
      }

      metadata[key] = value;
    }
  });

  return metadata;
}

// Function to recursively scan articles directory
function scanArticles(dir, basePath = "") {
  const articles = [];

  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(basePath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      const subArticles = scanArticles(fullPath, relativePath);
      articles.push(...subArticles);
    } else if (item.endsWith(".md")) {
      // Parse markdown file
      const content = fs.readFileSync(fullPath, "utf8");
      const metadata = parseFrontmatter(content);

      if (metadata) {
        articles.push({
          ...metadata,
          path: relativePath,
          category: metadata.category || path.dirname(relativePath),
        });
      }
    }
  });

  return articles;
}

// Main function to generate metadata
function generateMeta() {
  const articlesDir = path.join(__dirname, "..", "articles");
  const outputPath = path.join(__dirname, "..", "articles-meta.json");

  if (!fs.existsSync(articlesDir)) {
    console.error("Articles directory not found!");
    process.exit(1);
  }

  console.log("Scanning articles directory...");
  const allArticles = scanArticles(articlesDir);

  // Group articles by category
  const articlesByCategory = {};

  allArticles.forEach((article) => {
    const category = article.category || "uncategorized";

    if (!articlesByCategory[category]) {
      articlesByCategory[category] = [];
    }

    articlesByCategory[category].push({
      title: article.title,
      date: article.date,
      category: article.category,
      path: article.path,
      tags: article.tags,
      description: article.description,
    });
  });

  // Write to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(articlesByCategory, null, 2));

  console.log(`✅ Generated metadata for ${allArticles.length} articles`);
  console.log(`📁 Output saved to: ${outputPath}`);
  console.log("\nCategories found:");
  Object.keys(articlesByCategory).forEach((category) => {
    console.log(
      `  - ${category}: ${articlesByCategory[category].length} articles`
    );
  });
}

// Run the script
generateMeta();
