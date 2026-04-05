import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Mail, Globe } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-indigo-600 hover:text-indigo-500 mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          <div className="bg-indigo-600 px-8 py-10 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <ShieldCheck className="h-10 w-10" />
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
            </div>
            <p className="text-indigo-100">Last Updated: April 5, 2026</p>
          </div>

          <div className="p-8 sm:p-12 prose prose-indigo max-w-none">
            <p className="text-lg text-gray-600 leading-relaxed">
              This Privacy Policy applies to <strong>KLevelUp</strong> (“we”, “our”, “us”). It explains how we collect, use, disclose, and safeguard your information when you use our application and website.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              By using KLevelUp, you agree to the terms of this Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">1. Information We Collect</h2>
            <p>We collect information in the following categories:</p>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.1 Personal Information</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>Full name (if provided)</li>
              <li>Email address</li>
              <li>Profile information (if applicable)</li>
              <li>Any information you voluntarily submit</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.2 Account & Authentication Data</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>Login credentials (securely processed)</li>
              <li>OAuth data (if using Google or other providers)</li>
              <li>User ID and authentication tokens</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.3 Device & Technical Data</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device type and operating system</li>
              <li>Log data (timestamps, access logs)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.4 Usage Data</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>Pages visited</li>
              <li>Features used</li>
              <li>Session duration</li>
              <li>Interaction behavior</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.5 Cookies & Identifiers</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>Session cookies</li>
              <li>Authentication cookies</li>
              <li>Analytics identifiers</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">2. How We Use Your Information</h2>
            <p>We process your data for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>To provide and operate the application</li>
              <li>To create and manage user accounts</li>
              <li>To personalize user experience</li>
              <li>To improve performance and features</li>
              <li>To detect, prevent, and address fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">3. Legal Basis for Processing (GDPR-style)</h2>
            <p>We process your data based on:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li><strong>Consent</strong> – when you sign up or use features</li>
              <li><strong>Contractual necessity</strong> – to provide services</li>
              <li><strong>Legitimate interests</strong> – improving platform performance and security</li>
              <li><strong>Legal obligations</strong> – compliance with applicable laws</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">4. Data Sharing & Disclosure</h2>
            <p>We do <strong>NOT</strong> sell your personal data.</p>
            <p>We may share data only in the following cases:</p>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.1 Service Providers</h3>
            <p>We use trusted third-party services such as:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>Hosting via Vercel</li>
              <li>Authentication providers (if used)</li>
              <li>Analytics providers (if integrated)</li>
            </ul>
            <p>These providers process data on our behalf under confidentiality agreements.</p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.2 Legal Requirements</h3>
            <p>We may disclose data:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>To comply with legal obligations</li>
              <li>To respond to lawful requests by authorities</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.3 Business Transfers</h3>
            <p>In case of merger/acquisition, user data may be transferred.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">5. Data Retention</h2>
            <p>We retain your data:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>As long as your account is active</li>
              <li>As necessary to provide services</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p>When no longer required, data is deleted or anonymized.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">6. Data Security</h2>
            <p>We implement industry-standard safeguards:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>HTTPS encryption</li>
              <li>Secure authentication mechanisms</li>
              <li>Access control restrictions</li>
            </ul>
            <p>However, no system is completely secure.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">7. User Rights</h2>
            <p>Depending on your jurisdiction, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>Access your data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent</li>
              <li>Object to processing</li>
            </ul>
            <p>To exercise rights, contact us.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">8. Children’s Privacy</h2>
            <p>Our service is not intended for children under 13.</p>
            <p>We do not knowingly collect personal data from children. If discovered, such data will be deleted promptly.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">9. Cookies Policy</h2>
            <p>We use cookies to:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>Maintain login sessions</li>
              <li>Improve performance</li>
              <li>Analyze usage</li>
            </ul>
            <p>You can disable cookies via browser settings.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">10. Third-Party Links</h2>
            <p>Our service may contain links to third-party websites. We are not responsible for their privacy practices.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">11. International Data Transfers</h2>
            <p>Your information may be processed on servers located outside your country. We ensure appropriate safeguards are applied.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">12. Changes to This Privacy Policy</h2>
            <p>We may update this policy periodically. Changes will be posted with an updated date.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 border-b pb-2">13. Contact Information</h2>
            <p>If you have any questions:</p>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-6">
              <div className="flex items-center space-x-3 mb-4">
                <Mail className="h-5 w-5 text-indigo-600" />
                <span className="text-gray-700">Email: <a href="mailto:teams@codemaniacstudio.com" className="text-indigo-600 hover:underline">teams@codemaniacstudio.com</a></span>
              </div>
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-indigo-600" />
                <span className="text-gray-700">Website: <a href="https://codemaniacstudio.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">https://codemaniacstudio.com/</a></span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} KLevelUp. All rights reserved.
        </div>
      </div>
    </div>
  );
}
