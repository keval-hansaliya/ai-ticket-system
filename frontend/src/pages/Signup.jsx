import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function SignupPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/");
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (err) {
      alert("Something went wrong");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm shadow-xl bg-base-100">
        <form onSubmit={handleSignup} className="card-body">
          <h2 className="card-title justify-center">Sign Up</h2>

          <div className="alert alert-warning mb-4">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>Please wait a few seconds for the backend to start up (free tier limitation).</span>
            </div>
          </div>

          <div className="bg-base-200 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">Test Credentials (Use these instead):</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Admin:</strong> xcrc.69@gmail.com / 123</p>
              <p><strong>Moderator:</strong> sam2@gmail.com / 123</p>
              <p><strong>User:</strong> user1@gmail.com / 123</p>
            </div>
          </div>

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="input input-bordered w-full"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="input input-bordered w-full"
          />

          <div className="form-control mt-4">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </div>
          <p className="mt-4 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 underline">
              Log in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}