const User = require("../models/userModel");
const { createSession, desactivateSession } = require("./sessionControllers");
const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");

const signToken = async (id, res) => {
  const newSession = await createSession(id, res);
  return jwt.sign({ id, sessionId: newSession._id }, process.env.JWT_SECRET, {
    expiresIn: Date.parse(newSession.expiredAt),
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id, res);

  const { name, email } = user;

  return res.status(statusCode).json({
    status: "success",
    token,
    data: {
      name,
      email,
    },
  });
};

exports.protect = async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      status: "faild",
      error: "You are not logged in! Please log in to get access.",
    });
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return res.status(401).json({
      status: "faild",
      error: "The user belonging to this token does no longer exist.",
    });
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      status: "faild",
      error: "User recently changed password! Please log in again.",
    });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
};

exports.signup = async (req, res) => {
  try {
    // 1- Get the the new user from The User Module
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });
    // 2- Log user in, send JWT
    createSendToken(user, 200, res);
  } catch (error) {
    res.status(400).json({
      status: "faild",
      error: error.message,
      stack: error.stack,
    });
  }
};

exports.signin = async (req, res) => {
  try {
    // 1- Get the user from the database
    const user = await User.findOne({ email: req.body.email }).select(
      "+password"
    );
    if (
      !user ||
      !(await user.correctPassword(req.body.password, user.password))
    ) {
      throw new Error("User not found");
    }
    // 2- Log user in, send JWT
    createSendToken(user, 200, res);
  } catch (error) {
    res.status(401).json({
      status: "faild",
      error: error.message,
      stack: error.stack,
    });
  }
};

exports.signout = async (req, res) => {
  await desactivateSession(req, res);
};

exports.forgotPassword = async (req, res) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: "faild",
      error: "There is no user with email address.",
    });
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    resetToken,
  });
};

exports.resetPassword = async (req, res) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.resetToken)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return res.status(400).json({
      status: "faild",
      error: "Token is invalid or has expired",
    });
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
};

exports.updatePassword = async (req, res) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");
  const { currentPassword, newPassword, confirmPassword } = req.body;
  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return res.status(401).json({
      status: "faild",
      error: "Your current password is wrong.",
    });
  }

  // 3) If so, update password
  user.password = newPassword;
  user.passwordConfirm = confirmPassword;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log out the user, and remove JWT
  desactivateSession(req, res);
};
