"use client"// This tells Next.js: "Hey, this page has interactive buttons and inputs!"

import api from "@/lib/api";// Importing our custom mailman!
import { useRouter } from "next/navigation";
import { useState } from "react";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: unknown } }).response !== null
  ) {
    const data = (error as { response?: { data?: { error?: unknown } } }).response?.data;
    if (typeof data?.error === "string") {
      return data.error;
    }
  }

  return fallback;
};

export default  function RegisterPage(){
const router = useRouter();

// react State: this is hoe we store what the user is typing in real time
const [formData,setFormData]=useState({name:"",email:"",password:""});
const [error,setError]=useState("");

//this function runs every time a user types a letter into an input box

const handleChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
    setFormData({...formData,[e.target.name]:e.target.value});
};

//this function runs when they click the "sign up" button
const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault(); // stops the browser from refreashing the page
    setError(""); // clear any old error


try{
    //1. send the data to our Express backend
    await api.post("/users",formData);

    //2. if successful, redirsct them to the login page
    router.push("/login");
} catch(err: unknown){
//3. if its fails (likes id the email is already taken), show an error
setError(getApiErrorMessage(err, "Registration failed"));

}
}

return (
     <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Create an Account</h1>
        
        {/* If there is an error, this red box will appear */}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input 
              type="text" 
              name="name"
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              name="email"
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              name="password"
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              required
              minLength={8}
            />
          </div>

          <button 
            type="submit" 
            className="mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            Sign Up
          </button>
        </form>
      </div>
    </main>
)
};

