import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51R43YtFPVMr6vqufmvER9FTXnH8xoFOb78tR1QO5QNgxAMj8FElLm1NGIMio4swgZSfUsyxmbpAm2KSUbeqhCmSV009A9DmifB'
);

export const bookTour = async (tourId) => {
  try {
    const session = await axios(
      // 1) Get checkout session from API
      `/api/v1/bookings/checkout-session/${tourId}`
    );

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    // console.log(err);
    showAlert('error', err);
  }
};
