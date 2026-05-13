import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import "../App.css";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [values, setValues] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    axios
      .post(`${API_URL}/auth/adminlogin`, values)
      .then((result) => {
        if (result.data.loginStatus) {
          toast.success("Welcome " + values.email + "!");
          navigate("/dashboard");
        } else {
          toast.error(result.data.Error);
        }

        console.log(result);
      })
      .catch((error) => {
        toast.error("Login Failed!");
        console.error("Error logging in:", error);
      });
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center before:content-[''] before:fixed before:inset-0 before:bg-[url('')] before:bg-cover before:bg-center before:bg-no-repeat before:-z-10">
      <div className="flex flex-col md:flex-row w-full max-w-sm md:max-w-4xl px-4">
        <Card className="flex-1 flex items-center justify-center rounded-t-xl rounded-b-none md:rounded-l-xl md:rounded-r-none bg-[url('')] bg-cover bg-center bg-no-repeat">
          <CardContent className="text-center py-8">
            <div className="backdrop-blur-xl border text-white rounded-xl p-5">
              <h2 className="text-2xl font-bold mb-2">
                GT Electricals
              </h2>
              <p>Point of Sale System Login Portal</p>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full max-w-sm rounded-b-xl rounded-t-none md:rounded-r-xl md:rounded-l-none">
          <CardHeader>
            <CardTitle>Please login to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access GT POS
            </CardDescription>
            <CardAction>
              <Link to="/auth/register" className="underline text-sm mr-2">
                <Button variant="link">Sign Up</Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="enter email here"
                    required
                    onChange={(e) =>
                      setValues({ ...values, email: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="#"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    onChange={(e) =>
                      setValues({ ...values, password: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  Login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
