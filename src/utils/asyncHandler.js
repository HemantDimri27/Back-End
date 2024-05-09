//second way: using Promises

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise
    .resolve(requestHandler(req, res, next))
    .catch((err) => next(err))
  }
}


export {asyncHandler}






// first way: using try-catch


// const asyncHandler = (fn) => { () => {} }     // high order function, can accept and return function as parameter and return-value respectivly

// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next)
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message
//     })
//   }
// }