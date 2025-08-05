import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="text-gray-500 text-sm py-6 border-t-4 mt-10">
    <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
      <div className="text-sm text-gray-500 text-center">
        © {new Date().getFullYear()} <a href="https://edigatech.com" className="underline hover:text-gray-700" target="_blank" rel="noopener noreferrer">Ediga Technology Solutions LLC</a>. All rights reserved. <span className="italic">Flowtra™</span> is a product of EdigaTech.
      </div>
      <div className="flex space-x-4">
        <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
        <Link to="/terms" className="hover:underline">Terms of Use</Link>
        <a href="mailto:support@flowtra.app" className="hover:underline">Contact</a>
      </div>
    </div>
  </footer>
);

export default Footer;
