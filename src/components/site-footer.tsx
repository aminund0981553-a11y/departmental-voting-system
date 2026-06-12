import { Link } from "@tanstack/react-router";
import { Vote, Mail, Shield } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Vote className="h-5 w-5" /> GSU CS E-Voting
          </div>
          <p className="text-sm text-primary-foreground/70">
            Secure online elections for the Department of Computer Science,
            Gombe State University.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Explore</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><Link to="/elections">Elections</Link></li>
            <li><Link to="/results">Results</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/faqs">FAQs</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Account</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><Link to="/auth">Student Login</Link></li>
            <li><Link to="/auth" search={{ mode: "signup" }}>Register</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Contact</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> electoral@gsu.edu.ng</li>
            <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> Encrypted & audited</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 py-4 text-center text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} Department of Computer Science · Gombe State University
      </div>
    </footer>
  );
}
