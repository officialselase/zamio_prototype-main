import React, { useState } from 'react';
import {
  FileText,
  Shield,
  Eye,
  Lock,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Globe,
  Scale,
  BookOpen,
  Users,
  Music,
  DollarSign,
  Database,
  Server,
  Cloud,
  Wifi,
  Headphones,
  Radio,
  Award,
  Crown,
  Gem,
  Target,
  Layers,
  Calculator,
  Building,
  PiggyBank,
  Wallet,
  Settings,
  Bell,
  User,
  HelpCircle,
  MessageSquare,
  Clock,
  Activity,
  BarChart3,
  TrendingUp
} from 'lucide-react';

const Legal: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    terms: false,
    privacy: false,
    copyright: false,
    dataProtection: false,
    payments: false,
    disputes: false,
    platform: false,
    content: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const LegalSection = ({
    id,
    title,
    icon: Icon,
    lastUpdated,
    description,
    content,
    isExpanded,
    onToggle
  }: {
    id: string;
    title: string;
    icon: any;
    lastUpdated: string;
    description: string;
    content: string;
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/30 shadow-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors duration-200"
      >
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last updated: {formatDate(lastUpdated)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-slate-600">
          <div className="prose prose-sm max-w-none dark:prose-invert pt-6">
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {content}
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors duration-200">
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200">
                <ExternalLink className="w-4 h-4" />
                <span>Print Version</span>
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Effective: {formatDate(lastUpdated)}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Enhanced Page Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <Scale className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Legal & Compliance</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Access legal information, terms of service, privacy policy, and compliance documentation
                  </p>
                </div>
              </div>

              {/* Quick Stats in Header */}
              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    8
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Legal Sections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    GDPR
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Compliant</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    2024
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Last Updated</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <Download className="w-4 h-4" />
                <span>Download All</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Legal Sections */}
        <div className="grid grid-cols-1 gap-6">
          <LegalSection
            id="terms"
            title="Terms of Service"
            icon={FileText}
            lastUpdated="2024-01-15"
            description="Complete terms and conditions for using the Zamio platform"
            isExpanded={expandedSections.terms}
            onToggle={() => toggleSection('terms')}
            content={`TERMS OF SERVICE

Last Updated: January 15, 2024

1. ACCEPTANCE OF TERMS
By accessing and using Zamio ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement.

2. PLATFORM DESCRIPTION
Zamio is a music royalty collection and distribution platform that connects artists, rights holders, and broadcasters to ensure fair compensation for music usage.

3. USER ELIGIBILITY
- Must be at least 18 years old or have parental consent
- Must be a legal rights holder or authorized representative
- Must comply with all applicable laws and regulations

4. ACCOUNT REGISTRATION
- Users must provide accurate and complete information
- Account credentials must be kept secure
- Users are responsible for all activities under their account

5. CONTENT RIGHTS AND OWNERSHIP
- Artists retain ownership of their musical works
- Platform facilitates collection and distribution of royalties
- Users grant limited license for platform operations

6. ROYALTY COLLECTION AND DISTRIBUTION
- Platform uses industry-standard methodologies for tracking and collection
- Distributions occur according to predetermined schedules
- Users are responsible for providing accurate banking information

7. FEES AND PAYMENTS
- Platform charges a percentage-based fee for services
- Fees are deducted from collected royalties
- Payment processing fees may apply

8. PROHIBITED ACTIVITIES
- Unauthorized use of copyrighted material
- Manipulation of play data or reporting
- Interference with platform operations
- Violation of applicable laws and regulations

9. TERMINATION
- Either party may terminate this agreement
- Outstanding royalties will be distributed upon termination
- Platform reserves right to suspend accounts for violations

10. DISCLAIMERS
- Platform operates on "as is" basis
- No guarantees of specific royalty amounts
- Users responsible for tax compliance

11. LIMITATION OF LIABILITY
- Platform not liable for indirect damages
- Maximum liability limited to fees paid
- Users assume all risks associated with platform use

12. INDEMNIFICATION
Users agree to indemnify platform against claims arising from their use of the service or violation of these terms.

13. GOVERNING LAW
These terms are governed by the laws of Ghana, with disputes resolved through Ghanaian courts.

14. CHANGES TO TERMS
Platform reserves right to modify terms with appropriate notice to users.

15. CONTACT INFORMATION
For legal inquiries, contact: legal@zamio.com`}
          />

          <LegalSection
            id="privacy"
            title="Privacy Policy"
            icon={Shield}
            lastUpdated="2024-01-15"
            description="How we collect, use, and protect your personal information"
            isExpanded={expandedSections.privacy}
            onToggle={() => toggleSection('privacy')}
            content={`PRIVACY POLICY

Last Updated: January 15, 2024

1. INFORMATION WE COLLECT
We collect information you provide directly to us, information from your use of our services, and information from third parties.

2. PERSONAL INFORMATION
- Name, email, phone number, address
- Banking and payment information
- Musical works and rights information
- Platform usage data and analytics

3. HOW WE USE YOUR INFORMATION
- Provide and maintain our services
- Process royalty payments and distributions
- Communicate with you about your account
- Improve platform functionality and user experience
- Comply with legal obligations

4. INFORMATION SHARING
- We do not sell your personal information
- Share with payment processors for transactions
- Disclose to authorities when required by law
- Share aggregated data for industry reporting

5. DATA SECURITY
- Industry-standard encryption for data transmission
- Secure servers with access controls
- Regular security audits and updates
- Employee training on data protection

6. DATA RETENTION
- Retain data for duration of account activity
- Maintain records as required by law
- Delete data upon account termination request

7. YOUR RIGHTS
- Access and update your personal information
- Request data deletion (subject to legal requirements)
- Opt out of non-essential communications
- Data portability for exported information

8. COOKIES AND TRACKING
- Use cookies for platform functionality
- Analytics cookies for performance monitoring
- Marketing cookies with user consent

9. INTERNATIONAL DATA TRANSFERS
- Data may be transferred internationally
- Comply with applicable data protection laws
- Implement appropriate safeguards for transfers

10. CHILDREN'S PRIVACY
- Platform not intended for users under 18
- Do not knowingly collect children's data
- Parental consent required for minors

11. THIRD-PARTY SERVICES
- Platform integrates with third-party services
- Users subject to those services' privacy policies
- Platform not responsible for third-party practices

12. CHANGES TO PRIVACY POLICY
- Updates posted with effective date
- Users notified of material changes
- Continued use constitutes acceptance

13. CONTACT INFORMATION
For privacy inquiries, contact: privacy@zamio.com`}
          />

          <LegalSection
            id="copyright"
            title="Copyright & Intellectual Property"
            icon={Crown}
            lastUpdated="2024-01-15"
            description="Information about copyright protection and intellectual property rights"
            isExpanded={expandedSections.copyright}
            onToggle={() => toggleSection('copyright')}
            content={`COPYRIGHT AND INTELLECTUAL PROPERTY POLICY

Last Updated: January 15, 2024

1. COPYRIGHT PROTECTION
Zamio respects the intellectual property rights of artists, rights holders, and content creators. Our platform is designed to protect and enforce copyright laws.

2. MUSIC RIGHTS MANAGEMENT
- Platform facilitates proper licensing and royalty collection
- Works with performing rights organizations (PROs)
- Ensures accurate attribution and compensation

3. USER CONTENT OWNERSHIP
- Artists retain full ownership of their musical works
- Platform holds no ownership claims over user content
- Users responsible for ensuring they hold necessary rights

4. COPYRIGHT INFRINGEMENT
- Platform responds to valid DMCA takedown notices
- Users must not upload unauthorized copyrighted material
- Repeat infringers may have accounts terminated

5. LICENSING AND USAGE
- Platform obtains necessary licenses for music usage
- Mechanical royalties collected and distributed
- Performance royalties tracked and paid

6. CONTENT IDENTIFICATION
- Automated systems for content matching
- Manual review processes for disputed claims
- Cooperation with rights management databases

7. FAIR USE AND EXCEPTIONS
- Platform respects fair use provisions
- Educational and research exceptions considered
- Public domain works properly identified

8. INTERNATIONAL COPYRIGHT
- Compliance with Berne Convention standards
- Recognition of international copyright treaties
- Cross-border royalty collection and distribution

9. DIGITAL RIGHTS MANAGEMENT
- Technical measures to prevent unauthorized copying
- Watermarking and content protection systems
- Cooperation with anti-piracy initiatives

10. ARTIST PROTECTION
- Tools for artists to monitor their content
- Reporting mechanisms for unauthorized usage
- Legal support for copyright enforcement

11. PLATFORM INTELLECTUAL PROPERTY
- Platform code, design, and branding are protected
- Users may not copy or reverse engineer platform
- Trademark and service mark protections apply

12. OPEN SOURCE COMPONENTS
- Platform may use open source software
- Compliance with applicable open source licenses
- Attribution provided where required

13. USER GENERATED CONTENT
- Users retain rights to their platform contributions
- Limited license granted for platform operations
- Community guidelines for acceptable content

14. DISPUTE RESOLUTION
- Copyright disputes handled through mediation
- Arbitration available for complex cases
- Court litigation as final resort

15. CONTACT INFORMATION
For copyright inquiries, contact: copyright@zamio.com`}
          />

          <LegalSection
            id="dataProtection"
            title="Data Protection & GDPR"
            icon={Database}
            lastUpdated="2024-01-15"
            description="GDPR compliance and data protection measures"
            isExpanded={expandedSections.dataProtection}
            onToggle={() => toggleSection('dataProtection')}
            content={`DATA PROTECTION AND GDPR COMPLIANCE

Last Updated: January 15, 2024

1. GDPR COMPLIANCE
Zamio is fully compliant with the General Data Protection Regulation (GDPR) and other applicable data protection laws.

2. DATA CONTROLLER
- Zamio acts as data controller for user information
- Clear identification of data processing purposes
- Legal basis for each processing activity documented

3. DATA SUBJECT RIGHTS
Users have the following rights under GDPR:
- Right to access their personal data
- Right to rectification of inaccurate data
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to object to processing
- Right to restrict processing

4. CONSENT MANAGEMENT
- Clear consent mechanisms for data collection
- Granular consent options for different purposes
- Easy withdrawal of consent at any time
- Consent records maintained for audit purposes

5. DATA PROTECTION OFFICER
- Appointed Data Protection Officer (DPO)
- Contact: dpo@zamio.com
- Responsible for compliance monitoring and user inquiries

6. DATA PROCESSING ACTIVITIES
- Processing activities documented in privacy register
- Legal basis identified for each activity
- Data retention periods clearly defined
- Security measures implemented for all processing

7. INTERNATIONAL DATA TRANSFERS
- EU-US Privacy Shield compliance (where applicable)
- Standard Contractual Clauses for international transfers
- Adequacy decisions recognized where applicable
- Additional safeguards for sensitive data transfers

8. BREACH NOTIFICATION
- 72-hour breach notification to supervisory authorities
- User notification for high-risk breaches
- Breach response procedures documented and tested

9. DATA PROTECTION IMPACT ASSESSMENTS
- DPIAs conducted for high-risk processing activities
- Regular review and updates of impact assessments
- Mitigation measures implemented as needed

10. CHILDREN'S DATA PROTECTION
- Special protections for children's personal data
- Age verification mechanisms in place
- Parental consent requirements for minors

11. AUTOMATED DECISION MAKING
- No solely automated decisions affecting users
- Human oversight for all significant decisions
- Right to human intervention in automated processes

12. DATA MINIMIZATION
- Only necessary data collected for stated purposes
- Data collection limited to what is adequate and relevant
- Regular review of data collection practices

13. PURPOSE LIMITATION
- Data used only for specified, legitimate purposes
- No further processing incompatible with original purposes
- Clear communication of processing purposes to users

14. STORAGE LIMITATION
- Data retained only as long as necessary
- Clear retention schedules for different data types
- Secure deletion procedures for expired data

15. INTEGRITY AND CONFIDENTIALITY
- Technical and organizational security measures
- Encryption of personal data in transit and at rest
- Access controls and authentication requirements
- Regular security testing and vulnerability assessments

16. ACCOUNTABILITY
- Records of processing activities maintained
- Data protection policies regularly reviewed
- Staff training on data protection requirements
- Compliance monitoring and audit procedures

17. CROSS-BORDER COMPLIANCE
- Compliance with multiple data protection regimes
- Recognition of adequacy decisions from various jurisdictions
- Cooperation with international data protection authorities

18. DATA PROTECTION BY DESIGN
- Privacy considerations built into platform design
- Default privacy settings implemented
- Privacy-friendly options as default choices

19. THIRD-PARTY PROCESSORS
- Due diligence conducted on all data processors
- Data Processing Agreements in place
- Regular audits of processor compliance
- Clear liability provisions for processor breaches

20. CONTACT INFORMATION
For data protection inquiries, contact: privacy@zamio.com`}
          />

          <LegalSection
            id="payments"
            title="Payment Terms & Conditions"
            icon={CreditCard}
            lastUpdated="2024-01-15"
            description="Terms and conditions for royalty payments and financial transactions"
            isExpanded={expandedSections.payments}
            onToggle={() => toggleSection('payments')}
            content={`PAYMENT TERMS AND CONDITIONS

Last Updated: January 15, 2024

1. ROYALTY CALCULATION
- Royalties calculated based on verified usage data
- Industry-standard rates applied to all calculations
- Adjustments made for returns, disputes, and corrections

2. PAYMENT PROCESSING
- Payments processed through secure, PCI-compliant systems
- Multiple payout methods available based on user preference
- Processing times vary by payment method

3. MINIMUM PAYOUT THRESHOLDS
- Minimum payout amounts established per payment method
- Earnings accumulate until threshold is reached
- Users notified when approaching payout eligibility

4. PAYOUT SCHEDULE
- Regular payout schedules maintained
- Emergency payouts available for exceptional circumstances
- Users can request schedule changes with justification

5. CURRENCY CONVERSION
- Exchange rates determined by third-party providers
- Currency conversion fees may apply
- Historical rates used for transparency

6. TAX WITHHOLDING
- Platform complies with tax withholding requirements
- Users responsible for providing accurate tax information
- Tax documents provided for user records

7. PAYMENT VERIFICATION
- All payments verified before processing
- Users may be required to provide additional documentation
- Suspicious transactions investigated and held

8. FAILED PAYMENTS
- Failed payments investigated and reprocessed
- Users notified of payment failures and required actions
- Platform not responsible for user banking errors

9. DISPUTE RESOLUTION
- Payment disputes must be filed within specified timeframes
- Supporting documentation required for all disputes
- Resolution process documented and transparent

10. FRAUD PREVENTION
- Advanced fraud detection systems in place
- Unusual payment patterns flagged for review
- Cooperation with financial institutions for security

11. REFUNDS AND CHARGEBACKS
- Refund policies clearly communicated
- Chargeback disputes handled according to card network rules
- Users responsible for disputed transaction fees

12. PAYMENT SECURITY
- All payment data encrypted and secured
- Compliance with PCI DSS standards
- Regular security audits conducted

13. THIRD-PARTY PAYMENT PROCESSORS
- Platform partners with reputable payment processors
- Users subject to processor terms and conditions
- Platform not liable for processor errors or downtime

14. INTERNATIONAL PAYMENTS
- Support for international banking and payment systems
- Compliance with international financial regulations
- Additional documentation may be required for certain jurisdictions

15. PAYMENT RECORDS
- Complete payment history maintained for user access
- Records retained for legal and audit purposes
- Export functionality available for user records

16. FEE STRUCTURE
- Platform fees clearly disclosed and transparent
- No hidden fees or unexpected charges
- Fee changes communicated in advance

17. PAYMENT METHODS
- Multiple payout options for user convenience
- New payment methods added as technology evolves
- Users can update payment preferences at any time

18. ACCOUNT VERIFICATION
- Enhanced verification required for high-value accounts
- Additional security measures for large payouts
- KYC compliance for regulatory requirements

19. PAYMENT COMMUNICATIONS
- Users notified of all payment activities
- Email and platform notifications for payment status
- Support available for payment-related inquiries

20. CONTACT INFORMATION
For payment inquiries, contact: payments@zamio.com`}
          />

          <LegalSection
            id="disputes"
            title="Dispute Resolution"
            icon={Scale}
            lastUpdated="2024-01-15"
            description="Procedures for resolving disputes and conflicts"
            isExpanded={expandedSections.disputes}
            onToggle={() => toggleSection('disputes')}
            content={`DISPUTE RESOLUTION POLICY

Last Updated: January 15, 2024

1. DISPUTE TYPES
This policy covers disputes related to:
- Royalty calculations and payments
- Copyright claims and infringements
- Account access and security issues
- Platform functionality and performance
- Contract interpretation and enforcement

2. INFORMAL RESOLUTION
- Parties encouraged to resolve disputes amicably
- Direct communication facilitated through platform
- Mediation assistance provided when requested

3. FORMAL DISPUTE PROCESS
- Written notice required for formal disputes
- Specific details and supporting evidence must be provided
- Response timeframes clearly defined

4. MEDIATION
- Professional mediation services available
- Neutral third-party mediators utilized
- Mediation sessions conducted virtually or in-person

5. ARBITRATION
- Binding arbitration available for unresolved disputes
- Arbitration conducted according to established rules
- Arbitrator decisions are final and enforceable

6. LITIGATION
- Court proceedings as last resort for major disputes
- Jurisdiction determined by user location and dispute type
- Platform cooperation with legal processes

7. CLASS ACTION WAIVER
- Users waive right to participate in class actions
- Individual dispute resolution required
- Collective actions not permitted

8. GOVERNING LAW
- Disputes governed by laws of Ghana
- International disputes handled according to applicable treaties
- Choice of law provisions clearly stated

9. JURISDICTION AND VENUE
- Courts of Accra, Ghana for primary jurisdiction
- Alternative venues available for international users
- Forum selection clauses enforced

10. STATUTE OF LIMITATIONS
- Disputes must be filed within applicable time limits
- Different limitations for different dispute types
- Tolling provisions for ongoing investigations

11. EVIDENCE AND DOCUMENTATION
- All relevant evidence must be preserved
- Platform data and records made available
- Expert witnesses utilized when necessary

12. SETTLEMENT AND COMPROMISE
- Settlement agreements documented and binding
- Compromise solutions encouraged
- Settlement terms kept confidential

13. ENFORCEMENT
- Court judgments and arbitration awards enforced
- International enforcement through treaty mechanisms
- Platform cooperation with enforcement actions

14. APPEALS PROCESS
- Appeal rights for arbitration decisions
- Limited grounds for appeal available
- Appeal procedures clearly defined

15. COSTS AND FEES
- Each party bears own costs for dispute resolution
- Platform may cover mediation costs in certain cases
- Fee shifting provisions for bad faith disputes

16. CONFIDENTIALITY
- Dispute proceedings kept confidential
- Settlement terms not disclosed publicly
- Platform maintains confidentiality of user information

17. USER SUPPORT
- Dispute resolution support provided to users
- Guidance on process and requirements
- Assistance with documentation and evidence

18. PLATFORM IMMUNITY
- Platform not liable for user disputes
- Good faith actions protected from liability
- Compliance with dispute procedures required

19. DISPUTE PREVENTION
- Clear terms and policies to prevent disputes
- User education on platform processes
- Proactive communication and transparency

20. CONTACT INFORMATION
For dispute assistance, contact: disputes@zamio.com`}
          />

          <LegalSection
            id="platform"
            title="Platform Usage Guidelines"
            icon={BookOpen}
            lastUpdated="2024-01-15"
            description="Rules and guidelines for using the Zamio platform"
            isExpanded={expandedSections.platform}
            onToggle={() => toggleSection('platform')}
            content={`PLATFORM USAGE GUIDELINES

Last Updated: January 15, 2024

1. ACCEPTABLE USE POLICY
Users must comply with all applicable laws and regulations when using the Zamio platform. Prohibited activities include:

2. PROHIBITED CONTENT
- Copyright infringing material
- Hate speech or discriminatory content
- Violent or threatening material
- Adult or explicit content
- Malware or harmful software

3. ACCOUNT RESPONSIBILITIES
- Users responsible for account security
- Accurate information must be maintained
- Unauthorized access must be reported immediately
- Account sharing prohibited

4. DATA ACCURACY
- Users must provide accurate rights information
- Timely updates required for changes in ownership
- False or misleading information prohibited

5. PLATFORM INTEGRITY
- Interference with platform operations prohibited
- Automated tools must comply with rate limits
- Reverse engineering or hacking attempts forbidden

6. COMMUNICATION STANDARDS
- Respectful communication with other users
- No spam or unsolicited messages
- Professional conduct in all interactions

7. REPORTING REQUIREMENTS
- Suspicious activity must be reported
- Copyright infringements should be flagged
- Platform issues communicated through proper channels

8. CONTENT MANAGEMENT
- Users responsible for content they upload
- Regular review and updates expected
- Removal of outdated or incorrect information

9. THIRD-PARTY INTEGRATIONS
- Authorized integrations only permitted
- Compliance with third-party terms required
- Platform not responsible for third-party issues

10. PERFORMANCE EXPECTATIONS
- Platform provides service level commitments
- Users expected to use platform as intended
- Reasonable usage patterns required

11. DATA BACKUP
- Users responsible for backing up their data
- Platform provides export functionality
- Data loss prevention measures recommended

12. SUPPORT ACCESS
- Support available through designated channels
- Response times communicated clearly
- Users expected to provide complete information

13. FEATURE REQUESTS
- Users encouraged to suggest improvements
- Feature requests reviewed and prioritized
- Implementation timeline communicated

14. BETA FEATURES
- Beta features may be available for testing
- Different terms may apply to beta functionality
- Feedback requested for beta features

15. PLATFORM EVOLUTION
- Platform continuously improved and updated
- Users notified of significant changes
- Backward compatibility maintained when possible

16. USER EDUCATION
- Platform provides educational resources
- Users expected to understand basic functionality
- Training materials available for complex features

17. COMMUNITY STANDARDS
- Respectful and professional community expected
- Collaboration and knowledge sharing encouraged
- Conflicts resolved through proper channels

18. QUALITY ASSURANCE
- Users contribute to platform quality
- Bug reports and feedback valued
- Testing of new features requested

19. ACCESSIBILITY
- Platform designed for accessibility
- Users with disabilities accommodated
- Accessibility features continuously improved

20. CONTACT INFORMATION
For platform questions, contact: support@zamio.com`}
          />

          <LegalSection
            id="content"
            title="Content Ownership & Licensing"
            icon={Music}
            lastUpdated="2024-01-15"
            description="Terms regarding content ownership and licensing agreements"
            isExpanded={expandedSections.content}
            onToggle={() => toggleSection('content')}
            content={`CONTENT OWNERSHIP AND LICENSING

Last Updated: January 15, 2024

1. MUSIC RIGHTS OWNERSHIP
- Artists retain full ownership of their musical works
- Copyright in sound recordings and compositions maintained
- Moral rights and attribution rights preserved

2. LICENSING ARRANGEMENTS
- Platform facilitates licensing for music usage
- Mechanical licenses for reproductions
- Performance licenses for public performances
- Synchronization licenses for audiovisual works

3. ROYALTY SPLITS
- Users define royalty splits for collaborations
- Platform enforces agreed split percentages
- Split modifications require all parties' consent

4. PUBLISHING RIGHTS
- Publishing administration services available
- Collection and distribution of publishing royalties
- Publisher relationships managed through platform

5. NEIGHBORING RIGHTS
- Performers' rights in sound recordings protected
- Collection of neighboring rights royalties
- International neighboring rights administration

6. SYNCHRONIZATION RIGHTS
- Management of music in audiovisual content
- Licensing for film, TV, advertising, and games
- Sync royalty collection and distribution

7. DIGITAL RIGHTS
- Digital performance rights for streaming
- Interactive streaming royalties collected
- Non-interactive streaming rights managed

8. TERRITORIAL RIGHTS
- Worldwide rights management capabilities
- Territory-specific licensing arrangements
- International collection network utilized

9. RIGHTS CLEARANCE
- Platform assists with rights clearance processes
- Chain of title verification services
- Conflict resolution for overlapping claims

10. SAMPLE CLEARANCE
- Sample usage licensing and clearance
- Split agreements for sampled compositions
- Mechanical royalties for sample usage

11. COVER SONGS
- Licensing for cover versions and adaptations
- Mechanical royalties for cover recordings
- Performance royalties for cover performances

12. REMIXES AND DERIVATIVES
- Rights management for remixes and derivatives
- Original and derivative work splits defined
- Licensing for remix distribution

13. PUBLIC DOMAIN WORKS
- Identification and management of public domain content
- Appropriate usage of public domain materials
- No royalties collected for public domain works

14. WORK FOR HIRE
- Special provisions for work-for-hire arrangements
- Employer rights and employee contributions
- Platform facilitation of work-for-hire agreements

15. JOINT WORKS
- Co-authorship and joint ownership provisions
- Split agreements for joint compositions
- Dispute resolution for joint work issues

16. ASSIGNMENT AND TRANSFER
- Rights assignment and transfer management
- Documentation of ownership changes
- Notification requirements for transfers

17. EXPLOITATION RIGHTS
- Various rights of exploitation managed
- Reproduction, distribution, and performance rights
- Digital and physical format rights

18. MORAL RIGHTS
- Attribution and integrity rights protected
- Artist credit and recognition requirements
- Platform enforcement of moral rights

19. RIGHTS REGISTRATION
- Assistance with rights registration processes
- Copyright office filing support
- International registration coordination

20. CONTACT INFORMATION
For licensing inquiries, contact: licensing@zamio.com`}
          />
        </div>

        {/* Legal Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Compliance Status</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  GDPR Ready
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Full compliance maintained
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Legal Documents</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  8 Active
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  All documents current
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Last Updated</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  Jan 2024
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Regular updates maintained
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300">Support</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  24/7
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Legal inquiries supported
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/60 dark:to-purple-900/60 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Legal Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">legal@zamio.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">+233 30 123 4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">Accra, Ghana</span>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                For legal inquiries, copyright issues, or compliance questions, please contact our legal team using the information above.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Response time: 2-3 business days for routine inquiries, 24 hours for urgent matters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Legal;
