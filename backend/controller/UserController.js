const User = require("../models/UserModel");
const ErrorHandler = require("../utils/ErrorHandler.js");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendToken = require("../utils/jwtToken.js");
const sendMail = require("../utils/sendMail.js");
const crypto = require("crypto");
const cloudinary = require("cloudinary");
// abcxabwdbadwadaaw121
// Register user
exports.createUser = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, email, password, avatar } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    if (avatar == "/profile.png") {
      user = await User.create({
        name,
        email,
        password,

        // avatar: { public_id: myCloud.public_id, url: myCloud.secure_url },
      });
    } else {
      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
      });
      user = await User.create({
        name,
        email,
        password,
        //  avatar,
        avatar: { public_id: myCloud.public_id, url: myCloud.secure_url },
      });
    }

    // user = await User.create({
    //   name,
    //   email,
    //   password,

    //   // avatar: { public_id: myCloud.public_id, url: myCloud.secure_url },
    // });

    sendToken(user, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Login User
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Vui lòng nhập Email và Mật khẩu!!!", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(
      new ErrorHandler("Tài khoản & mật khẩu không chính xác!!!", 401)
    );
  }
  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    return next(
      new ErrorHandler("Tài khoản & mật khẩu không chính xác!!!", 401)
    );
  }

  sendToken(user, 201, res);
});

//  Log out user
exports.logoutUser = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Đăng xuất thành công!!!",
  });
});

// Forgot password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(
      new ErrorHandler(
        "Không tìm thấy người dùng liên kết với Email này!!!",
        404
      )
    );
  }

  // Get ResetPassword Token

  const resetToken = user.getResetToken();

  await user.save({
    validateBeforeSave: false,
  });

  const resetPasswordUrl = `${req.protocol}://${req.get(
    "host"
  )}/password/reset/${resetToken}`;

  const message = `Token lấy lại mật khẩu của bạn là :- \n\n ${resetPasswordUrl}`;

  try {
    await sendMail({
      email: user.email,
      subject: `Ecommerce Password Recovery`,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email đã gửi tới ${user.email}`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordTime = undefined;

    await user.save({
      validateBeforeSave: false,
    });

    return next(new ErrorHandler(error.message, 500));
  }
});

// Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  // Create Token hash

  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordTime: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorHandler("Url đặt lại mật khẩu không hợp lệ hoặc đã hết hạn", 400)
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new ErrorHandler("Url đặt lại mật khẩu không hợp lệ hoặc đã hết hạn", 400)
    );
  }

  user.password = req.body.password;

  user.resetPasswordToken = undefined;
  user.resetPasswordTime = undefined;

  await user.save();

  sendToken(user, 200, res);
});

//  Get user Details
exports.userDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

// Update User Password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Mật khẩu cũ không khớp!!!", 400));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHandler("Mật khẩu không khớp!!!", 400));
  }

  user.password = req.body.newPassword;

  await user.save();

  sendToken(user, 200, res);
});

// Update User Profile
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
      name: req.body.name,
      email: req.body.email,
      address: req.body.address,
      province: req.body.province,
      district: req.body.district,
      wards: req.body.wards,
      phoneNumber: req.body.phoneNumber,
    };
    if (req.body.avatar !== "") {
      const user = await User.findById(req.user.id);
  
      const imageId = user.avatar.public_id;
  
      await cloudinary.v2.uploader.destroy(imageId);
  
      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      });
      newUserData.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    }
  
    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
      new: true,
      runValidator: true,
      useFindAndModify: false,
    });
  
    res.status(200).json({
      success: true,
    });
  });

// Get All users ---Admin
exports.getAllUsers = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

// Get Single User Details ---Admin
exports.getSingleUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("User is not found with this id", 400));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// Change user Role --Admin
exports.updateUserRole = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };
  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    user,
  });
});

// Delete User ---Admin
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  const imageId = user.avatar;

  await cloudinary.v2.uploader.destroy(imageId);

  if (!user) {
    return next(new ErrorHandler("Không tìm thấy tài khoản có ID này", 400));
  }

  await user.remove();

  res.status(200).json({
    success: true,
    message: "Xóa thành công!!!",
  });
});
