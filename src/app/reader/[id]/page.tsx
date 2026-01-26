import { notFound } from 'next/navigation';
import ReaderView from '@/components/Reader/ReaderView';
import demoBooks from '@/data/demo-books.json';

interface ReaderPageProps {
    params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
    return demoBooks.books.map((book) => ({
        id: book.id,
    }));
}

export async function generateMetadata({ params }: ReaderPageProps) {
    const { id } = await params;
    const book = demoBooks.books.find((b) => b.id === id);

    if (!book) {
        return { title: 'Book not found' };
    }

    return {
        title: `${book.title} - LinguaRead`,
        description: `Read ${book.title} by ${book.author} in multiple languages`,
    };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
    const { id } = await params;
    const book = demoBooks.books.find((b) => b.id === id);

    if (!book) {
        notFound();
    }

    return <ReaderView book={book as any} />;
}
