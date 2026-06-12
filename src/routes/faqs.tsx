import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "How do I register?", a: "Click 'Register' and complete the form with your matric number, department and email." },
  { q: "I forgot my password.", a: "Use the 'Forgot password' link on the login page to reset via email." },
  { q: "Can I change my vote?", a: "No. Once a vote is cast and confirmed, it cannot be changed." },
  { q: "How are results calculated?", a: "Each ballot adds one vote to the chosen candidate. The candidate with the most votes per position wins." },
  { q: "Who runs the election?", a: "The Electoral Committee of the Department of Computer Science, GSU." },
];

export const Route = createFileRoute("/faqs")({
  head: () => ({ meta: [{ title: "FAQs — GSU CS E-Voting" }] }),
  component: () => (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>
        <Accordion type="single" collapsible className="mt-8">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <SiteFooter />
    </div>
  ),
});
