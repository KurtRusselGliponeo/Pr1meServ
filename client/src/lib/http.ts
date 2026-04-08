import axios from 'axios';
import { appConfig } from '../config/env';

export const http = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});
