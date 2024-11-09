import { Router } from "express";
import {
  createNewBlog,
  editExistingBlog,
  likeBlogPost,
  addCommentOnBlog,
  getSingleBlogPost,
  getAllBlogPosts,
} from "../controllers/blog.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

//unauthenticated routes
router.route("/").get(getAllBlogPosts);
router.route("/view-post").post(getSingleBlogPost);

//secured routes
router.route("/create-post").post(verifyJWT, createNewBlog);
router.route("/edit-post").post(verifyJWT, editExistingBlog);
router.route("/like-post").post(verifyJWT, likeBlogPost);
router.route("/comment-post").post(verifyJWT, addCommentOnBlog);

export default router;
