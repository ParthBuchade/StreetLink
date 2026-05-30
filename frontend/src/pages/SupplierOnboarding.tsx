import { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "@/services/api";

const SupplierOnboarding = () => {

  const [formData, setFormData] = useState({
    business_name: "",
    gst_number: "",
    pan_number: "",
    aadhaar_number: "",
    address: "",
    bank_details: "",
  });

  const [submitting, setSubmitting] =
    useState(false);

  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {

      const response = await API.post(
        "/suppliers/onboard",
        formData
      );

      console.log(response.data);

      alert(
        "Supplier onboarding submitted"
      );

      navigate("/wholesaler");

    } catch (error: any) {

      console.log(
        "ONBOARDING ERROR RAW:",
        error
      );

      console.log(
        "ONBOARDING ERROR RESPONSE:",
        error.response
      );

      alert(
        error.response?.data?.message ||
        "Onboarding failed"
      );

    } finally {

      setSubmitting(false);

    }

  };

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Supplier Onboarding
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-w-xl"
      >

        <input
          type="text"
          name="business_name"
          placeholder="Business Name"
          onChange={handleChange}
          className="border p-3 w-full"
          required
        />

        <input
          type="text"
          name="gst_number"
          placeholder="GST Number"
          onChange={handleChange}
          className="border p-3 w-full"
          required
        />

        <input
          type="text"
          name="pan_number"
          placeholder="PAN Number"
          onChange={handleChange}
          className="border p-3 w-full"
          required
        />

        <input
          type="text"
          name="aadhaar_number"
          placeholder="Aadhaar Number"
          onChange={handleChange}
          className="border p-3 w-full"
          required
        />

        <input
          type="text"
          name="address"
          placeholder="Address"
          onChange={handleChange}
          className="border p-3 w-full"
          required
        />

        <input
          type="text"
          name="bank_details"
          placeholder="Bank Details"
          onChange={handleChange}
          className="border p-3 w-full"
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="
            bg-green-600
            text-white
            px-6
            py-3
            rounded
            disabled:opacity-50
          "
        >
          {submitting
            ? "Submitting..."
            : "Submit"}
        </button>

      </form>

    </div>

  );

};

export default SupplierOnboarding;