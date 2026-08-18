import axios from 'axios';

//create a pre-configuresd instance of axios
const api=axios.create({
    baseURL:'http://localhost:5000'
})

// this automatically attaches the jwt wristband to every request
api.interceptors.request.use((config)=>{
    // We check if we are in the browser (window exists) to avoid Next.js server errors
if(typeof window!=='undefined'){
    const token=localStorage.getItem('token');
    if(token){
        config.headers.Authorization=`Bearer ${token}`;

    }
}
return config;
});

export default api;