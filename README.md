# Blog and User Management API

This project provides an Express.js API for managing users and blog posts. It includes routes for user authentication, account management, and CRUD operations for blog posts. The API uses JWT (JSON Web Tokens) for secured routes, and Multer for handling file uploads like avatar and cover images.

## Features

- **Blog Post Creation**: Users can create new blog posts with a title, content, tags, and associated author information.
- **Blog Post Retrieval**: Users can view individual blog posts with detailed information such as title, content, author, comments, likes, and tags.
- **Blog Post Pagination**: Fetch a paginated list of blog posts, displaying essential details like title, author, number of likes, and comments count. Pagination is done with query parameters `page` and `limit`.
- **Like and Unlike Posts**: Users can like or unlike blog posts. The system tracks whether the logged-in user has liked a specific post.
- **Commenting on Blog Posts**: Users can add comments to blog posts. Each comment is linked to the user who posted it and includes the user's avatar.
- **Author Check**: Users can check if they are the author of a blog post and manage their posts accordingly.
- **Search by Tags**: Users can filter blog posts by tags, making it easier to find relevant content.
- **Secure Routes**: Only accessible with a valid JWT token:
  - Create, update, or delete a blog post
  - Like or unlike a post
  - Add or delete comments on a blog post
  - Retrieve the current user’s blog post interactions

## **User Management Routes**

### `POST /register`

- Registers a new user.
- Supports uploading `avatarImage` and `coverImage`.

### `POST /login`

- Authenticates a user and generates a session token.

### `POST /logout`

- Logs out the current user (secured route, requires JWT).

### `POST /refresh-token`

- Refreshes the user's access token.

### `POST /change-password`

- Allows the user to change their password (secured route, requires JWT).

### `GET /get-current-user`

- Retrieves the current authenticated user's information (secured route, requires JWT).

### `PATCH /update-account`

- Updates user account details (secured route, requires JWT).

### `PATCH /update-user-avatar`

- Updates the user’s avatar image (secured route, requires JWT).

### `PATCH /update-user-cover`

- Updates the user’s cover image (secured route, requires JWT).

---

## **Blog Post Routes**

### `GET /`

- Retrieves a list of all blog posts.

### `POST /view-post`

- Retrieves a single blog post by its ID.

### `POST /create-post`

- Creates a new blog post (secured route, requires JWT).

### `POST /edit-post`

- Edits an existing blog post (secured route, requires JWT).

### `POST /like-post`

- Likes a blog post (secured route, requires JWT).

### `POST /comment-post`

- Adds a comment to a blog post (secured route, requires JWT).

---

## **Middleware**

- **verifyJWT**: Middleware to verify the user's JWT token and secure the routes.
- **upload**: Middleware for handling file uploads using Multer (e.g., for avatars and cover images).

---

## Technologies Used

- **Node.js**: JavaScript runtime for server-side logic.
- **Express.js**: Web framework for Node.js.
- **MongoDB**: NoSQL database to store user data.
- **Mongoose**: ODM for MongoDB, used for defining the user model and interacting with the database.
- **JWT (JSON Web Tokens)**: For secure authentication and token management.
- **Cloudinary**: For storing and managing avatar and cover images (or any other image hosting service).

## How to Run

### 1. **Clone the Repository**

```bash
git clone https://github.com/jiniyasshah/blog-platform-api.git
cd blog-platform-api
```

### 2. **Install Dependencies**

```bash
npm install
```

### 3. **Set Up Environment Variables**

```bash
PORT =
CORS_ORIGIN =
MONGODB_URI =
ACCESS_TOKEN_SECRET =
ACCESS_TOKEN_EXPIRY =
REFRESH_TOKEN_SECRET =
REFRESH_TOKEN_EXPIRY =
CLOUDINARY_CLOUD_NAME =
CLOUDINARY_API_KEY =
CLOUDINARY_API_SECRET =
```

### 4. **Start the Server**

```bash
npm run dev
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes and commit them (`git commit -am 'Add feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a new pull request.

We welcome all contributions! Please make sure your code adheres to the existing coding style, and include tests for new functionality where applicable.
