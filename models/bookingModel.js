const mongoose = require('mongoose');
const { path } = require('../app');

const bookingSchema = new mongoose.Schema( // creating a booking schema
  {
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Booking must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Booking must belong to a user.'],
    },
    price: {
      type: Number,
      required: [true, 'Booking must have a price.'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    paid: {
      type: Boolean,
      default: true,
    },
  },
  {
    toJSON: { virtuals: true }, // this will make sure that when a booking is outputted as JSON, the virtuals will be included
    toObject: { virtuals: true }, // this will make sure that when a booking is outputted as an object, the virtuals will be included
  }
);

// middleware to populate the user and tour fields in the booking model
bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({ path: 'tour', select: 'name' });

  next();
});

const Booking = mongoose.model('Booking', bookingSchema); // creating a Booking model
module.exports = Booking; // exporting the Booking model
