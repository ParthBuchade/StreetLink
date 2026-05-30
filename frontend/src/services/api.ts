import axios from 'axios';

import { auth } from '@/lib/firebase';

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

API.interceptors.request.use(
  async (config) => {

    const user = auth.currentUser;

    if (user) {

      const token = await user.getIdToken();

      config.headers.Authorization = `Bearer ${token}`;

    }

    return config;

  },
  (error) => Promise.reject(error)
);

export default API;