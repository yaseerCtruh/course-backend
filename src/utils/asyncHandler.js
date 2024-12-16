const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
