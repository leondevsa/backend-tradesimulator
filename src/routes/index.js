const express = require('express');
const router = express.Router();

const defaultRoutes = [  
  {
    path: '/deposit',
    route: require('./deposit.route'),
  },  
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
