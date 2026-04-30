import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { DocumentUploadModal } from '../document-upload-modal';

const queryClient = new QueryClient();

function renderWithQueryClient(ui: React.ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('DocumentUploadModal', () => {
  test('blocks invalid file types like .exe and shows an error', async () => {
    renderWithQueryClient(<DocumentUploadModal isOpen onClose={() => {}} />);

    const fileInput = screen.getByLabelText(/upload document file/i);
    const invalidFile = new File(['exe content'], 'malicious.exe', {
      type: 'application/x-msdownload',
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid file type/i);
    expect(screen.queryByText('malicious.exe')).not.toBeInTheDocument();
  });

  test('accepts supported PDF files and renders the selected file name', async () => {
    renderWithQueryClient(<DocumentUploadModal isOpen onClose={() => {}} />);

    const fileInput = screen.getByLabelText(/upload document file/i);
    const pdfFile = new File(['%PDF-1.4'], 'branch-policy.pdf', {
      type: 'application/pdf',
    });

    await userEvent.upload(fileInput, pdfFile);

    expect(screen.getByText('branch-policy.pdf')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('PDF') && content.includes('MB')),
    ).toBeInTheDocument();
  });
});
