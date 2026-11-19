import axios from 'axios';

// Bypass responses cached with the admin workspace's credentialed CORS headers.
const publicApi = axios.create({ adapter: 'fetch', fetchOptions: { cache: 'no-store' } });
export default publicApi;
