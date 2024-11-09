import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { BlogPost } from "../models/blog.model.js";

// Creates a new blog post and saves it to the database.
const createNewBlog = asyncHandler(async (req, res) => {
  const { title, content, tags } = req.body;

  if (!title || !content) {
    throw new ApiError(
      400,
      `Blog ${title ? "content" : "title"} must not be empty !!`
    );
  }

  const blogpost = await BlogPost.create({
    title,
    content,
    tags,
    author: req.user?._id,
  });

  const createdBlogPost = await BlogPost.find({ title: blogpost.title });
  if (!createdBlogPost) {
    throw new ApiError(500, "Something went wrong while creating blog post !!");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(200, createdBlogPost, "Post created successfully !!")
    );
});

// Edits an existing blog post with updated data.
const editExistingBlog = asyncHandler(async (req, res) => {
  const { id, title, content, tags } = req.body;

  if (!id) {
    throw new ApiError(400, "Blog post ID is required to update.");
  }

  if (!title && !content && !tags) {
    throw new ApiError(
      400,
      "At least one field (title, content, or tags) is required to update."
    );
  }

  // Create an object with only the fields to update
  const updateFields = {};
  if (title) updateFields.title = title;
  if (content) updateFields.content = content;
  if (tags) updateFields.tags = tags;

  // Find and update the blog post
  const updatedBlogPost = await BlogPost.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true }
  );

  if (!updatedBlogPost) {
    throw new ApiError(404, "Blog post not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedBlogPost, "Post updated successfully!"));
});

// Likes a blog post and updates the like count.
const likeBlogPost = asyncHandler(async (req, res) => {
  const { id } = req.body;
  const userId = req.user._id;

  const blogPost = await BlogPost.findById(id);
  if (!blogPost) {
    throw new ApiError(404, "Blog post not found.");
  }

  const hasLiked = blogPost.likedBy.includes(userId);

  if (hasLiked) {
    // Remove user ID from likedBy and decrement like count
    blogPost.likedBy.pull(userId);
    blogPost.likes -= 1;
  } else {
    // Add user ID to likedBy and increment like count
    blogPost.likedBy.push(userId);
    blogPost.likes += 1;
  }

  await blogPost.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        blogPost,
        hasLiked ? "Like removed!" : "Post liked successfully!"
      )
    );
});

// Adds a comment to a blog post.
const addCommentOnBlog = asyncHandler(async (req, res) => {
  const { id, content } = req.body; // Comment content

  if (!content) {
    throw new ApiError(400, "Comment content must not be empty.");
  }

  const comment = {
    user: req.user?._id, // Assuming user is authenticated and `req.user` contains their info
    content,
    createdAt: new Date(),
  };

  const blogPost = await BlogPost.findByIdAndUpdate(
    id,
    { $push: { comments: comment } }, // Push the new comment into comments array
    { new: true } // Return the updated document
  );

  if (!blogPost) {
    throw new ApiError(404, "Blog post not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, blogPost, "Comment added successfully!"));
});

// Retrieves a single blog post by its ID.
const getSingleBlogPost = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Fetch the blog post
  const blogPost = await BlogPost.findById(id)
    .populate("author", "username avatarImage")
    .populate("comments.user", "username avatarImage")
    .populate("likedBy", "username avatarImage");

  if (!blogPost) {
    throw new ApiError(404, "Blog post not found.");
  }
  if (req.user) {
    const userId = req.user._id;
    const hasLiked = blogPost.likedBy.includes(userId);
    const isAuthor = blogPost.author._id.toString() === userId.toString();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { blogPost, hasLiked, isAuthor },
          "Post fetched successfully!"
        )
      );
  } else {
    // If the user is not authenticated, send the post without the like and author info
    return res
      .status(200)
      .json(new ApiResponse(200, blogPost, "Post fetched successfully!"));
  }
});

// Retrieves all blog posts from the database.
const getAllBlogPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10 items

  // Ensure 'page' and 'limit' are valid numbers
  const validPage = Math.max(1, parseInt(page, 10)); // Default to 1 if invalid
  const validLimit = Math.min(Math.max(1, parseInt(limit, 10)), 100); // Max limit of 100

  // Aggregation pipeline for fetching blog posts
  const aggregation = [
    {
      $sort: { createdAt: -1 }, // Sorting by latest first (descending)
    },
    {
      $skip: (validPage - 1) * validLimit, // Skip records based on page
    },
    {
      $limit: validLimit, // Limit the number of records per page
    },
    {
      $lookup: {
        from: "users", // Assuming "User" collection for authors
        localField: "author",
        foreignField: "_id",
        as: "authorDetails",
      },
    },
    {
      $unwind: "$authorDetails", // Flatten the authorDetails
    },
    {
      $project: {
        title: 1,
        author: "$authorDetails.username",
        avatarImage: "$authorDetails.avatarImage",
        likes: { $size: "$likedBy" }, // Number of likes
        commentsCount: { $size: "$comments" }, // Number of comments
        tags: 1, // Include if needed for categorization or filtering
      },
    },
  ];

  // Run the aggregation with pagination options
  const blogs = await BlogPost.aggregate(aggregation).exec();

  if (!blogs || blogs.length === 0) {
    throw new ApiError(404, "No blog posts found.");
  }

  // Send response with paginated blog posts
  return res
    .status(200)
    .json(new ApiResponse(200, blogs, "Blog posts fetched successfully!"));
});

export {
  createNewBlog,
  editExistingBlog,
  likeBlogPost,
  addCommentOnBlog,
  getSingleBlogPost,
  getAllBlogPosts,
};
