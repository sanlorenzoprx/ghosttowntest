import { useState } from 'react';
import { IdeaIntake as IdeaIntakeType } from '../types/lit';

interface Props {
  onSubmit: (idea: IdeaIntakeType) => void;
  initialIdea?: IdeaIntakeType | null;
}

export default function IdeaIntake({ onSubmit, initialIdea }: Props) {
  const [formData, setFormData] = useState<IdeaIntakeType>(initialIdea ?? {
    ideaName: '',
    description: '',
    targetUser: '',
    painfulProblem: '',
    currentAlternative: '',
    motivation: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publicAcknowledged, setPublicAcknowledged] = useState(
    initialIdea?.publicContentAcknowledged === true
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ideaName.trim()) newErrors.ideaName = 'Idea name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.targetUser.trim()) newErrors.targetUser = 'Target user is required';
    if (!formData.painfulProblem.trim()) newErrors.painfulProblem = 'Problem statement is required';
    if (!publicAcknowledged) newErrors.publicContent = 'Please acknowledge public video distribution';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ ...formData, publicContentAcknowledged: true });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8 sm:pb-8">
      <h2 className="text-3xl font-bold mb-2">{initialIdea ? 'Make this idea yours' : 'Tell us about your idea'}</h2>
      <p className="text-gray-600 mb-6">{initialIdea
        ? 'This starter came preloaded from the gallery. Edit anything before the test.'
        : "Be specific. We'll use this to test the idea and build your verdict."}</p>

      {initialIdea && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <span className="font-bold">Example idea loaded.</span> Nothing is sent until you start the test.
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Idea Name */}
        <div>
          <label htmlFor="ideaName" className="block font-bold mb-2">
            What's your idea called?
          </label>
          <input
            data-testid="idea-input"
            id="ideaName"
            type="text"
            name="ideaName"
            value={formData.ideaName}
            onChange={handleChange}
            placeholder="e.g., AI QA for Design Agencies"
            className={`min-h-12 w-full rounded border px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.ideaName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.ideaName && <p className="text-red-600 text-sm mt-1">{errors.ideaName}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block font-bold mb-2">
            What does it do?
          </label>
          <textarea
            name="description"
            id="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="One paragraph. Be specific about what it does and who uses it."
            className={`h-28 w-full rounded border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
        </div>

        {/* Target User */}
        <div>
          <label htmlFor="targetUser" className="block font-bold mb-2">
            Who is it for? (Be specific)
          </label>
          <input
            type="text"
            id="targetUser"
            name="targetUser"
            value={formData.targetUser}
            onChange={handleChange}
            placeholder="e.g., Web design agencies with 5-50 employees"
            className={`min-h-12 w-full rounded border px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.targetUser ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.targetUser && <p className="text-red-600 text-sm mt-1">{errors.targetUser}</p>}
        </div>

        {/* Painful Problem */}
        <div>
          <label htmlFor="painfulProblem" className="block font-bold mb-2">
            What painful problem does it solve?
          </label>
          <textarea
            name="painfulProblem"
            id="painfulProblem"
            value={formData.painfulProblem}
            onChange={handleChange}
            placeholder="What pain or frustration does this relieve? Why would someone pay for this?"
            className={`h-24 w-full rounded border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.painfulProblem ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.painfulProblem && <p className="text-red-600 text-sm mt-1">{errors.painfulProblem}</p>}
        </div>

        {/* Current Alternative */}
        <div>
          <label htmlFor="currentAlternative" className="block font-bold mb-2">
            How do people solve this today? <span className="font-normal text-gray-500">(Optional)</span>
          </label>
          <input
            type="text"
            id="currentAlternative"
            name="currentAlternative"
            value={formData.currentAlternative}
            onChange={handleChange}
            placeholder="What's the current workaround or solution?"
            className="min-h-12 w-full rounded border border-gray-300 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-gray-500 text-sm mt-1">Knowing what people do today helps us see what your idea must beat</p>
        </div>

        {/* Motivation */}
        <div>
          <label htmlFor="motivation" className="block font-bold mb-2">
            Why do you want to build this? <span className="font-normal text-gray-500">(Optional)</span>
          </label>
          <textarea
            name="motivation"
            id="motivation"
            value={formData.motivation}
            onChange={handleChange}
            placeholder="What's your personal motivation? Why now?"
            className="h-24 w-full rounded border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-gray-500 text-sm mt-1">This helps us understand what is driving the idea. It does not make the verdict better or worse.</p>
        </div>

        <div className={`rounded-lg border p-4 ${errors.publicContent ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={publicAcknowledged}
              onChange={event => {
                setPublicAcknowledged(event.target.checked);
                if (errors.publicContent) setErrors(previous => ({ ...previous, publicContent: '' }));
              }}
              className="mt-1 h-5 w-5"
              required
            />
            <span className="text-sm text-gray-800">
              I understand GhostTown may create and distribute public content from this submission, including my verdict and a short video. I will not include private, confidential, or identifying information.
            </span>
          </label>
          {errors.publicContent && <p className="mt-2 text-sm text-red-700">{errors.publicContent}</p>}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.1)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <button
            data-testid="evaluate-button"
            type="submit"
            className="min-h-12 w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 active:bg-blue-800"
          >
            Start My Free Test · About 5 Minutes
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">No account required. Progress saves automatically.</p>
        </div>
      </form>
    </div>
  );
}
