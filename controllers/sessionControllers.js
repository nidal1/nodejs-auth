const Session = require("../models/sessionModel");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");

const getSessionId = async (req) => {
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    throw new Error("Invalid authorization");
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  return decoded.sessionId;
};

exports.createSession = async (userId, res) => {
  try {
    const newSession = await Session.create({ userId });
    return newSession;
  } catch (error) {
    res.status(500).json({
      status: "faild",
      error: error.message,
      stack: error.stack,
    });
  }
};

exports.desactivateSession = async (req, res) => {
  try {
    const sessionId = await getSessionId(req);
    const updatedSession = await Session.findByIdAndUpdate(sessionId, {
      expiredAt: Date.now(),
      active: false,
    });
    if (!updatedSession) {
      return res.status(400).json({
        status: "faild",
        error: "Invalid session",
      });
    }
    res.status(200).json({
      status: "success",
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      status: "faild",
      error: error.message,
      stack: error.stack,
    });
  }
};
