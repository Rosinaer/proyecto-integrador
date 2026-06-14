import client from "./client";

export const createResource = (path) => ({
  list: async (params) => (await client.get(`/${path}`, { params })).data,
  get: async (id) => (await client.get(`/${path}/${id}`)).data,
  create: async (data) => (await client.post(`/${path}`, data)).data,
  update: async (id, data) => (await client.patch(`/${path}/${id}`, data)).data,
  remove: async (id) => (await client.delete(`/${path}/${id}`)).data,
  sub: async (id, sub, params) => (await client.get(`/${path}/${id}/${sub}`, { params })).data,
});

export default createResource;
