import API from './api';

export const getSupplierProfile = async () => {

  const response = await API.get(
    '/suppliers/me'
  );

  return response.data;

};