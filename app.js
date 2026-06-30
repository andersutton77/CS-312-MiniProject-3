const express = require("express");
const app = express();
const PORT = 3000;

const session = require("express-session");

const { Client } = require("pg");
const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "BlogDB",
  password: "admin",
  port: 5432
});

client.connect().catch(err => console.error("Postgres connection error", err));

// Middleware

app.use(express.static("public"));  // Serve static files from the 'public' directory
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies
app.use(express.json());  // Parse JSON bodies if needed
app.use(session({
  secret: "blog-secret-key",
  resave: false,
  saveUninitialized: false
}));
app.use((req, res, next) => {
  res.locals.user = req.session.user_id ? {
    user_id: req.session.user_id,
    name: req.session.name
  } : null;

  next();
});

// view engine
app.set("view engine", "ejs");  // Set EJS as the view engine
app.set("views", "views");  // Default view directory




// path for getting all blog posts
app.get("/", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM blogs ORDER BY date_created DESC"
    );

    console.log(result.rows);

    res.render("index", {
      posts: result.rows
    });

  } catch (err) {
    console.error(err);

    res.render("index", {
      posts: []
    });
  }
});

// path for creating blog posts
app.post("/create", async (req, res) => {
  
  try {
    if (!req.session.user_id) {
      return res.redirect("/signin");
    }
    const { title, content } = req.body;

await client.query(
  "INSERT INTO blogs (creator_name, creator_user_id, title, body, date_created) VALUES ($1, $2, $3, $4, $5)",
  [req.session.name, req.session.user_id, title, content, new Date()]
);
    res.redirect("/");  //return to index page

  } catch (err) {
    console.error(err);
    return res.status(400).send("Invalid request data");  
  }

});


app.get("/edit/:id", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM blogs WHERE blog_id = $1",
      [parseInt(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Post not found");
    }

    res.render("edit", { post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching post");
  }
});


app.post("/edit/:id", async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(401).send("You must be logged in");
    }

    const blogId = parseInt(req.params.id);
    const { title, content } = req.body;

    // verify the user making the edit owns the post
    const check = await client.query(
      "SELECT * FROM blogs WHERE blog_id = $1",
      [blogId]
    );

    if (check.rows.length === 0) {
      return res.status(404).send("Post not found");
    }

    if (check.rows[0].creator_user_id !== req.session.user_id) {
      return res.status(403).send("You may only edit your own posts");
    }

    // update post
    await client.query(
      "UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3",
      [title, content, blogId]
    );

    res.redirect("/");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating post");
  }
});


app.post("/delete/:id", async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(401).send("You must be logged in");
    }

    const blogId = parseInt(req.params.id);

    // verify ownership of post
    const check = await client.query(
      "SELECT * FROM blogs WHERE blog_id = $1",
      [blogId]
    );

    if (check.rows.length === 0) {
      return res.status(404).send("Post not found");
    }

    if (check.rows[0].creator_user_id !== req.session.user_id) {
      return res.status(403).send("You may only delete your own posts");
    }

    // delete post
    await client.query(
      "DELETE FROM blogs WHERE blog_id = $1",
      [blogId]
    );

    res.redirect("/");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting post");
  }
});


//  get routes for sign-up and sign-in pages
app.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

app.get("/signin", (req, res) => {
  res.render("signin", { error: null });
});

//  post route for handling sign-in submissions
app.post("/signin", async (req, res) => {
  try {
    const { user_id, password } = req.body;
    const result = await client.query(
      "SELECT * FROM users WHERE user_id = $1 AND password = $2",
      [user_id, password]
    );

    if (result.rows.length === 0) {  //  reject invalid credentials
      return res.render("signin", {
        error: "ERROR: Invalid user ID or password."
      });
    }  

    //  store user information in session
    req.session.user_id = result.rows[0].user_id;
    req.session.name = result.rows[0].name;

    res.redirect("/");  //  accept valid credentials and redirect to blog feed

  } catch (err) {
    console.error(err);
    res.send("Sign-in error. Please try again.");
  }
});

//  post route for handling sign-up submissions
app.post("/signup", async (req, res) => {
  try {
    const { user_id, name, password } = req.body;

    // check if user exists
    const check = await client.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );

    if (check.rows.length > 0) {
      return res.render("signup", {
        error: "User ID has already been taken."
      });
    }

    // insert new user
    await client.query(
      "INSERT INTO users (user_id, name, password) VALUES ($1, $2, $3)",
      [user_id, name, password]
    );

    // redirect to sign-in
    res.redirect("/signin");

  } catch (err) {
    console.error(err);
    res.send("Signup error");
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
