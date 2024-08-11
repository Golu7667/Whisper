/* eslint-disable camelcase */
const UserRouter = require('express').Router();

const { v4: uuidv4 } = require('uuid');

const multer = require('multer');
// multer for profile image
const storage = multer.memoryStorage();
const imageUpload = multer({ storage: storage });

const User = require('../models/UserSchema');
const { emailValidator } = require('../utils/helper');

const {
  OK,
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
  CONFLICT,
} = require('../httpStatusCodes.js');

const createUserWithAutoId = async (email) => {
  // Logic to create a new user with an autogenerated ID
  return User.create({ _id: uuidv4(), email });
};

const createUserWithId = async (email, id) => {
  return User.create({ _id: id, email });
};

const loginUser = async (req, res) => {
  const { email, id } = req.body;
  try {
    const findUser = await User.findOne({ email });

    if (!findUser) {
      let newUser;
      if (id) {
        newUser = await createUserWithId(email, id);
      } else {
        newUser = await createUserWithAutoId(email);
      }

      const newId = newUser._id;

      return res.status(200).json({
        id: newId,
      });
    } else if (findUser && id) {
      // User already exists, and an ID was provided
      return res.status(CONFLICT).json();
    }

    // User exists, return their ID
    res.status(OK).json({
      id: findUser._id,
    });
  } catch (err) {
    // Handle errors
    res.status(INTERNAL_SERVER_ERROR).json({
      message: `An error occurred while logging in: ${err}`,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const { email } = req.params;

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(NOT_FOUND).json({ error: 'User not found' });
    }

    // Send the user profile data as JSON response
    res.status(OK).json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  const { username, aboutMe, gender, age, email, settings } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(NOT_FOUND).json({ error: 'User not found' });
    }

    // Update user's profile with provided fields or the User fields or defaults
    user.username = username || user.username || 'Anonymous';
    user.aboutMe = aboutMe || user.aboutMe || null;
    user.gender = gender || user.gender || 'Unknown';
    user.age = age || user.age || null;
    user.settings = settings || user.settings;
    user.profileImage = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : user.profileImage;

    // Save the updated user profile
    await user.save();

    return res.status(OK).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    return res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal server error' });
  }
};

const deleteUser = async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(NOT_FOUND).json({ error: 'User not found' });
    }

    // Delete the user
    await user.deleteOne();

    return res.status(OK).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    return res
      .status(INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal server error' });
  }
};

UserRouter.route('/login').post(emailValidator, loginUser);
UserRouter.route('/profile').post(
  imageUpload.single('profileImage'),
  emailValidator,
  updateProfile
);
UserRouter.route('/profile/:email').get(getProfile);
UserRouter.route('/deleteUser').delete(emailValidator, deleteUser); //Email validation applied to the required request handlers

module.exports = UserRouter;
