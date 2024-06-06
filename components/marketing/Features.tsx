import {
  LetterCaseCapitalizeIcon,
  MixIcon,
  ReaderIcon,
  RocketIcon,
  StarIcon,
  TimerIcon,
} from '@radix-ui/react-icons';

export function Features() {
  const features = [
    {
      title: 'Instant Response',
      text: 'Provides immediate answers to customer inquiries, reducing wait times and enhancing the customer experience with prompt, accurate information.',
      icon: <RocketIcon className="rounded-base size-12" />,
    },
    {
      title: '24/7 Availability',
      text: 'Operates around the clock, ensuring that customers can get support at any time, day or night, without relying on the availability of human agents.',
      icon: <TimerIcon className="rounded-base size-12" />,
    },
    {
      title: 'Workflows',
      text: 'Automatically resolves common support tickets by providing relevant solutions, freeing up your support team to focus on more complex issues.',
      icon: <StarIcon className="rounded-base size-12" />,
    },
    {
      title: 'Multilingual Support',
      text: 'Interacts with customers in multiple languages, broadening your reach and ensuring that non-English speakers receive the same level of support.',
      icon: <LetterCaseCapitalizeIcon className="rounded-base size-12" />,
    },
    {
      title: 'Continuous Learning',
      text: 'Uses machine learning to continuously improve responses based on new data and interactions, ensuring that it becomes more accurate and efficient.',
      icon: <ReaderIcon className="rounded-base size-12" />,
    },
    {
      title: 'Seamless Integration',
      text: 'Easily integrates with your existing customer support platforms and tools, allowing for a smooth transition and minimal disruption to your current workflow.',
      icon: <MixIcon className="rounded-base size-12" />,
    },
  ];

  return (
    <section className="bg-bg font-base border-t-2 border-t-black py-20 lg:py-[100px]">
      <h2 className="font-heading mb-14 px-5 text-center text-2xl md:text-3xl lg:mb-20 lg:text-4xl">
        Why should you use Answerify?
      </h2>
      <div className="container mx-auto grid grid-cols-1 gap-5 px-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          return (
            <div
              className="rounded-base shadow-base flex flex-col gap-3 border-2 border-black bg-white p-5"
              key={feature.title}
            >
              {feature.icon}
              <h4 className="font-heading mt-2 text-xl">{feature.title}</h4>
              <p>{feature.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
