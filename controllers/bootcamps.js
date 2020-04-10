const path = require("path");
const Bootcamp = require("../models/Bootcamp");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const geocoder = require("../utils/geocoder");

//@desc Get all getBootcamps
//@route Get /api/v1/getBootcamps
//@access Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
  // let query;

  // // Copy req.query
  // const reqQuery = { ...req.query };

  // // Fields to exclude
  // const removeFields = ["select", "sort", "page", "limit"];

  // // Loop over removeFields and delete them from reqQuery
  // removeFields.forEach((param) => delete reqQuery[param]);
  // console.log(reqQuery);

  // // Create query string
  // let queryStr = JSON.stringify(reqQuery);

  // //Create operator {$gt, $gte, etc}
  // queryStr = queryStr.replace(
  //   /\b(gt|gte|lt|lte|in)\b/g,
  //   (match) => `$${match}`
  // );

  // //Finding resource
  // console.log(queryStr);
  // query = Bootcamp.find(JSON.parse(queryStr)).populate("courses");

  // //SELECT FIELDS
  // if (req.query.select) {
  //   const fields = req.query.select.split(",").join(" ");
  //   query = query.select(fields);
  // }

  // //Sort
  // if (req.query.sort) {
  //   const sortBy = req.query.sort.split(",").join(" ");
  //   query = query.sort(sortBy);
  // } else {
  //   query = query.sort("-createdAt");
  // }

  // // Pagination
  // const page = parseInt(req.query.page, 10) || 1;
  // const limit = parseInt(req.query.limit, 10) || 25;
  // const startIndex = (page - 1) * limit;
  // const endIndex = page * limit;
  // const total = await Bootcamp.countDocuments();

  // query = query.skip(startIndex).limit(limit);

  // //Executing Query
  // const bootcamps = await query;

  // //Pagination result
  // const pagination = {};

  // if (endIndex < total) {
  //   pagination.next = {
  //     page: page + 1,
  //     limit,
  //   };
  // }

  // if (startIndex > 0) {
  //   pagination.prev = {
  //     page: page - 1,
  //     limit,
  //   };
  // }

  res.status(200).json(res.advancedResults);
});

//@desc Get single getBootcamp
//@route Get /api/v1/getBootcamps/:id
//@access Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
   return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: bootcamp });
  //res.status(400).json({success:false,})
  // next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`,404));
  // next(error)
});

//@desc Create new bootcamp
//@route Post /api/v1/getBootcamps
//@access Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {

  //Add user to req.body
  req.body.user = req.user.id;

  //Check for published bootcamp
  const publishedBootcamp = await Bootcamp.findOne({user:req.user.id})

  //If the user is not admin, they can only add one bootcamp
  if(publishedBootcamp && req.user.role !== 'admin'){
    return next(new Error(`The user with ID ${req.user.id} has already published a bootcamp`,400))
  }


  const bootcamp = await Bootcamp.create(req.body);
  res.status(201).json({ success: true, data: bootcamp });
});

//@desc Update bootcamp
//@route Put /api/v1/getBootcamps/:id
//@access Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {

  let bootcamp = await Bootcamp.findById(req.params.id);

  // const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
  //   new: true,
  //   runValidators: true,
  // });

  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sur user is bootcamp owner
  if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`User ${req.params.id} id not authorized to update this bootcamp`, 401)
    );
  }

    bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: bootcamp });
});

//@desc Delete bootcamp
//@route Put /api/v1/getBootcamps/:id
//@access Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }

   // Make sur user is bootcamp owner
   if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`User ${req.params.id} id not authorized to delete this bootcamp`, 401)
    );
  }


  bootcamp.remove();

  res.status(200).json({ success: true, data: {} });
});

//@desc Get bootcamps within a radius
//@route GET /api/v1/getBootcamps/radius/:zipcode/:distance/:unit
//@access Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
  const { zipcode, distance } = req.params;

  //Get lat/lng from geocoder
  const loc = await geocoder.geocode(zipcode);
  const lat = loc[0].latitude;
  const lng = loc[0].longitude;

  //Calc radius using radians
  //Divide dist by radius of Earth
  //Earth Radius = 3,963 mi /6,378 km

  const radius = distance / 3963;

  const bootcamps = await Bootcamp.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    success: true,
    count: bootcamps.length,
    data: bootcamps,
  });
});

//@desc Upload photo for bootcamp
//@route Put /api/v1/getBootcamps/:id/photo
//@access Private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is bootcamp owner
  if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`User ${req.params.id} id not authorized to update this bootcamp`, 401)
    );
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 404));
  }

  const file = req.files.file;
  // const files = file.mimetype;
  // console.log(file.mimetype);

  // Make sure the image is a photo
  if (!file.mimetype.startsWith("image")) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }

  //Check Filesizwe
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image less then ${process.env.MAX_FILE_Upload}`,
        400
      )
    );
  }

  //Create custom filename
  file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }
    await Bootcamp.findByIdAndUpdate(req.params.id,{photo: file.name});

    res.status(200).json({
      success: true,
      data: file.name
    })

  });

});
