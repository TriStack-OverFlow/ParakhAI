import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-[#111] text-zinc-400 py-12 px-6 lg:px-20 text-sm font-sans border-t border-zinc-800 z-20 relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-10 justify-between pb-10 border-b border-zinc-800">
        
        {/* Columns like Apple footer */}
        <div className="flex flex-col space-y-3">
          <h4 className="text-zinc-200 font-semibold mb-2">Shop and Learn</h4>
          <Link to="#" className="hover:text-white transition">Platform Overview</Link>
          <Link to="#" className="hover:text-white transition">Features</Link>
          <Link to="#" className="hover:text-white transition">Pricing</Link>
          <Link to="#" className="hover:text-white transition">Testimonials</Link>
          <Link to="#" className="hover:text-white transition">Case Studies</Link>
        </div>

        <div className="flex flex-col space-y-3">
          <h4 className="text-zinc-200 font-semibold mb-2">Account</h4>
          <Link to="#" className="hover:text-white transition">Manage Account</Link>
          <Link to="#" className="hover:text-white transition">Billing</Link>
          <Link to="#" className="hover:text-white transition">API Keys</Link>
          <h4 className="text-zinc-200 font-semibold mt-4 mb-2">Entertainment</h4>
          <Link to="#" className="hover:text-white transition">Events</Link>
          <Link to="#" className="hover:text-white transition">Webinars</Link>
        </div>

        <div className="flex flex-col space-y-3">
          <h4 className="text-zinc-200 font-semibold mb-2">For Business</h4>
          <Link to="#" className="hover:text-white transition">Enterprise Integration</Link>
          <Link to="#" className="hover:text-white transition">Manufacturing</Link>
          <Link to="#" className="hover:text-white transition">Logistics</Link>
          <h4 className="text-zinc-200 font-semibold mt-4 mb-2">For Education</h4>
          <Link to="#" className="hover:text-white transition">University Licensing</Link>
        </div>

        <div className="flex flex-col space-y-3">
          <h4 className="text-zinc-200 font-semibold mb-2">Values & Impact</h4>
          <Link to="#" className="hover:text-white transition">Zero Defect Promise</Link>
          <Link to="#" className="hover:text-white transition">Environment</Link>
          <Link to="#" className="hover:text-white transition">Privacy</Link>
          <Link to="#" className="hover:text-white transition">Supply Chain Innovation</Link>
          <h4 className="text-zinc-200 font-semibold mt-4 mb-2">About Parakh.AI</h4>
          <Link to="#" className="hover:text-white transition">Newsroom</Link>
          <Link to="#" className="hover:text-white transition">Leadership</Link>
          <Link to="#" className="hover:text-white transition">Career Opportunities</Link>
          <Link to="#" className="hover:text-white transition">Contact Us</Link>
        </div>
        
      </div>
      
      <div className="max-w-7xl mx-auto pt-6">
        <p className="mb-4">Questions about Parakh.AI? Contact our support engineers or <Link to="/contact" className="text-cyan-400 hover:text-cyan-300 hover:underline">call an expert</Link>.</p>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <span>Copyright © 2026 ParakhAI Inc. All rights reserved.</span>
          <div className="flex space-x-4">
            <Link to="#" className="hover:text-white transition border-r border-zinc-700 pr-4">Privacy Policy</Link>
            <Link to="#" className="hover:text-white transition border-r border-zinc-700 pr-4">Terms of Use</Link>
            <Link to="#" className="hover:text-white transition border-r border-zinc-700 pr-4">Sales Policy</Link>
            <Link to="#" className="hover:text-white transition border-r border-zinc-700 pr-4">Legal</Link>
            <Link to="#" className="hover:text-white transition">Site Map</Link>
          </div>
          <span>India</span>
        </div>
      </div>
    </footer>
  );
}