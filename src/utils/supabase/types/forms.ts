// Registration form for events
export interface RegistrationForm {
  first_name: string;
  last_name: string;
  phone: string;
}

// Saved form for people who have been saved/come to faith
export interface SavedForm {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  needs_ride: boolean;
}

// Login form
export interface LoginForm {
  email: string;
  password: string;
}

// Register form
export interface RegisterForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

// Form validation state
export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

// Generic form state
export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}
