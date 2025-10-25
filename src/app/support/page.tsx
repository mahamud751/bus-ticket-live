"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  HelpCircle,
  BookOpen,
  PhoneCall,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  category: string;
}

// FAQ data
const faqs: FAQ[] = [
  {
    id: "1",
    category: "Booking",
    question: "How can I book a bus ticket?",
    answer:
      "You can book tickets online through our website by selecting your route, date, and preferred seats. Payment can be made using credit/debit cards or mobile banking.",
  },
  {
    id: "2",
    category: "Booking",
    question: "Can I modify or cancel my booking?",
    answer:
      "Yes, you can modify or cancel your booking up to 2 hours before departure. Cancellation charges may apply based on the time of cancellation.",
  },
  {
    id: "3",
    category: "Payment",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit/debit cards, mobile banking (bKash, Nagad, Rocket), and internet banking for secure transactions.",
  },
  {
    id: "4",
    category: "Travel",
    question: "What should I bring for travel?",
    answer:
      "Please bring a valid ID proof, your ticket (digital or printed), and arrive at the departure point at least 30 minutes before scheduled departure.",
  },
  {
    id: "5",
    category: "Refund",
    question: "How long does it take to process refunds?",
    answer:
      "Refunds are typically processed within 3-5 business days after cancellation approval. The amount will be credited to your original payment method.",
  },
  {
    id: "6",
    category: "Technical",
    question: "I'm having trouble with the website. What should I do?",
    answer:
      "Please try clearing your browser cache and cookies, or use a different browser. If the issue persists, contact our technical support team.",
  },
];

export default function SupportPage() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    category: "general",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFAQToggle = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const handleFormChange = (field: keyof ContactForm, value: string) => {
    setContactForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success(
        "Your message has been sent successfully! We'll get back to you within 24 hours."
      );

      setContactForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        category: "general",
      });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: Phone,
      title: "Phone Support",
      description: "Call us for immediate assistance",
      value: "+880 1789-999-751",
      action: "tel:+8801789999751",
      available: "9 AM - 9 PM (Daily)",
      color: "text-green-600",
    },
    {
      icon: Mail,
      title: "Email Support",
      description: "Send us an email for detailed queries",
      value: "support@busticket.com",
      action: "mailto:support@busticket.com",
      available: "24/7 (Response within 6 hours)",
      color: "text-blue-600",
    },
    {
      icon: MessageSquare,
      title: "WhatsApp",
      description: "Chat with us on WhatsApp",
      value: "+880 1789-999-751",
      action: "https://wa.me/8801789999751",
      available: "9 AM - 9 PM (Daily)",
      color: "text-green-600",
    },
  ];

  const categories = [
    { value: "general", label: "General Inquiry" },
    { value: "booking", label: "Booking Issues" },
    { value: "payment", label: "Payment Problems" },
    { value: "technical", label: "Technical Support" },
    { value: "complaint", label: "Complaint" },
    { value: "suggestion", label: "Suggestion" },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Booking":
        return <BookOpen className="h-4 w-4" />;
      case "Payment":
        return <CheckCircle className="h-4 w-4" />;
      case "Travel":
        return <MapPin className="h-4 w-4" />;
      case "Refund":
        return <AlertCircle className="h-4 w-4" />;
      case "Technical":
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Customer Support
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We&apos;re here to help! Get in touch with our support team for any
            questions or assistance you need.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactMethods.map((method, index) => {
                  const Icon = method.icon;
                  return (
                    <motion.div
                      key={index}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={`h-6 w-6 ${method.color} mt-1`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">
                            {method.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {method.description}
                          </p>
                          <div className="font-medium text-foreground mb-1">
                            {method.value}
                          </div>
                          <div className="text-xs text-muted-foreground mb-3">
                            {method.available}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => window.open(method.action, "_blank")}
                            className="w-full"
                          >
                            <PhoneCall className="h-4 w-4 mr-2" />
                            Contact Now
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Office Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monday - Friday:</span>
                    <span className="font-medium">9:00 AM - 9:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday:</span>
                    <span className="font-medium">10:00 AM - 8:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday:</span>
                    <span className="font-medium">10:00 AM - 6:00 PM</span>
                  </div>
                  <div className="border-t pt-2 mt-3">
                    <div className="flex justify-between">
                      <span>Emergency Support:</span>
                      <span className="font-medium text-green-600">24/7</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Send us a Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitForm} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={contactForm.name}
                          onChange={(e) =>
                            handleFormChange("name", e.target.value)
                          }
                          placeholder="Your full name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) =>
                            handleFormChange("email", e.target.value)
                          }
                          placeholder="your.email@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={contactForm.phone}
                          onChange={(e) =>
                            handleFormChange("phone", e.target.value)
                          }
                          placeholder="+880 1XXX-XXX-XXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <select
                          id="category"
                          value={contactForm.category}
                          onChange={(e) =>
                            handleFormChange("category", e.target.value)
                          }
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                        >
                          {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={contactForm.subject}
                        onChange={(e) =>
                          handleFormChange("subject", e.target.value)
                        }
                        placeholder="Brief description of your inquiry"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        value={contactForm.message}
                        onChange={(e) =>
                          handleFormChange("message", e.target.value)
                        }
                        placeholder="Please describe your question or issue in detail..."
                        rows={6}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2" />
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {faqs.map((faq) => (
                      <div
                        key={faq.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => handleFAQToggle(faq.id)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {getCategoryIcon(faq.category)}
                            <div>
                              <Badge variant="secondary" className="mb-1">
                                {faq.category}
                              </Badge>
                              <div className="font-medium text-foreground">
                                {faq.question}
                              </div>
                            </div>
                          </div>
                          {expandedFAQ === faq.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        {expandedFAQ === faq.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="px-4 pb-4"
                          >
                            <div className="pl-8">
                              <p className="text-muted-foreground">
                                {faq.answer}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
