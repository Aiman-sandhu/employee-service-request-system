const errorHandler = (err, req, res, next) => {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
};

const notFound = (req, res) => {
  res.status(404).json({ message: "Route not found" });
};

module.exports = { errorHandler, notFound };