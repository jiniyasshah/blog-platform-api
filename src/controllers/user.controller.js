import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken";

//Access And Refresh Token Generation
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    console.log(user);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong during generating access and refresh token !!"
    );
  }
};

//Register User on SignUp (Includes Form Data and Image Data)
const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;
  if (
    [username, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(404, "All fields are required !!");
  }
  const isUserRegistered = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (isUserRegistered) {
    throw new ApiError(409, "User is already registered !!");
  }
  let avatarImageLocalPath;
  let coverImageLocalPath;

  if (req.files && req.files.avatarImage) {
    avatarImageLocalPath = req.files.avatarImage[0]?.path;
  }

  if (req.files && req.files.coverImage) {
    coverImageLocalPath = req.files.coverImage[0]?.path;
  }

  if (!avatarImageLocalPath) {
    throw new ApiError(400, "Avatar Image must be provided !!");
  }
  const avatarImage = await uploadOnCloudinary(avatarImageLocalPath);

  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatarImage.url) {
    throw new ApiError(400, "Avatar Image upload failed. Retry !!");
  }

  if (coverImageLocalPath && !coverImage.url) {
    throw new ApiError(400, "Cover Image upload failed. Retry !!");
  }

  const user = await User.create({
    username,
    email,
    password,
    fullName,
    avatarImage: avatarImage.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user !!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully !!"));
});

//Login Existing User (Includes User(Email/Username) and Password)
const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  if (!(email || username) || !password) {
    throw new ApiError(
      400,
      `${!email ? `Username ${!username ? "or Email " : ""}and ` : !username ? "Email and " : ""}${!password ? "Password " : ""}is required !!`
    );
  }

  const registeredUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!registeredUser) {
    throw new ApiError(404, "User doesn't exists !!");
  }
  const isPasswordValid = await registeredUser.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials !!");
  }
  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    registeredUser._id
  );

  const loggedUser = await User.findById(registeredUser._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully !!"
      )
    );
});

//Logout Existing User
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User has been logged out !!"));
});

// Renews expired access tokens using a secure refresh token for seamless user sessions.
const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request !!");
    }
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const userData = await User.findById(decodedToken._id);
    if (!userData) {
      throw new ApiError(401, "Invalid Access Token !!");
    }

    if (incomingRefreshToken !== userData?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired !!");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
      userData._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Tokens refreshed successfully !!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token !!");
  }
});

// Securely updates the password for the currently authenticated user.
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new ApiError(404, "All fields are required !!");
  }
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      401,
      "New Password and Confirm Password must be same !!"
    );
  }
  if (oldPassword == newPassword) {
    throw new ApiError(
      401,
      "New Password must be different from old password !!"
    );
  }
  const userData = await User.findById(req.user?._id);
  const isPasswordValid = await userData.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials !!");
  }
  userData.password = newPassword;
  await userData.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully changed the password !!"));
});

// Retrieves the profile details of the currently authenticated user.
const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Succesfully fetched user data !!"));
});

// Updates account details for the authenticated user.
const updateAccount = asyncHandler(async (req, res) => {
  const { email, fullName } = req.body;

  if (!email && !fullName) {
    throw new ApiError(400, "At least one of the fields is required!!");
  }
  //Initialize the updateFields object with empty strings is not an optimal approach because it would still include the fields in the update
  const updateFields = {};
  if (email) updateFields.email = email;
  if (fullName) updateFields.fullName = fullName;

  const userData = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateFields },
    { new: true } // Returns the updated document
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, userData, "Account details updated successfully")
    );
});

// Updates the profile avatar image for the authenticated user.
const updateUserAvatarImage = asyncHandler(async (req, res) => {
  const avatarImageLocalPath = req.file?.path;

  if (!avatarImageLocalPath) {
    throw new ApiError(400, "Avatar Image is missing !!");
  }
  const avatarImage = avatarImageLocalPath
    ? await uploadOnCloudinary(avatarImageLocalPath)
    : null;

  if (!avatarImage.url) {
    throw new ApiError(400, "Avatar Image upload failed. Retry !!");
  }

  const userData = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatarImage: avatarImage.url } },
    { new: true } // Returns the updated document
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, userData, "Avatar Image updated successfully !!")
    );
});

// Updates the cover image for the authenticated user's profile.
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image is missing !!");
  }
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  //Todo: Delete Old Cover Image

  if (!coverImage.url) {
    throw new ApiError(400, "Cover Image upload failed. Retry !!");
  }

  const userData = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true } // Returns the updated document
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, userData, "Cover Image updated successfully !!")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccount,
  updateUserAvatarImage,
  updateUserCoverImage,
};
