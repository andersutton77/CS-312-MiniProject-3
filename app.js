const express = require("express");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static("public"));  // Serve static files from the 'public' directory
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies
app.use(express.json());  // Parse JSON bodies if needed

// View engine
app.set("view engine", "ejs");  // Set EJS as the view engine
app.set("views", "views");  // Default view directory

let posts = []  // Array to act as DB for blog postings

// Routes
app.get("/", (req, res) => {
  res.render("index", { posts });
});  // Render the index page with all posts

app.post("/create", (req, res) => {

  const newPost = {
    id: Date.now(),
    author: req.body.author,
    title: req.body.title,
    content: req.body.content,
    createdAt: new Date().toLocaleString()
  };

  posts.push(newPost);

  res.redirect("/");
});  // Create a new post and redirect to the index page

app.get("/edit/:id", (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) {
    return res.status(404).send("Post not found");  // If post not found, return 404; the built in code generation recommended this
  }
  res.render("edit", { post });
});  // Render the edit page with the selected post

app.post("/edit/:id", (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) {
    return res.status(404).send("Post not found");
  } // Find the post to edit; the built in code generation recommended this
  post.author = req.body.author;
  post.title = req.body.title;
  post.content = req.body.content;
  res.redirect("/");
}); // Update the post and redirect to the index page

app.post("/delete/:id", (req, res) => {
  posts = posts.filter(p => p.id !== parseInt(req.params.id));
  res.redirect("/");
});  // Delete the post and redirect to the index page

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});