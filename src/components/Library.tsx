import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Book, UserPlus, Search, User, FileText, Send, XCircle, Clock, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ConfirmModal, AlertModal } from './Modals';

export function Library() {
  const { user, userData } = useAuth();
  const [availableBooks, setAvailableBooks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'borrow' | 'cancel', payload: any } | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ title: string, message: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch all books that are available, in process, or borrowed, and NOT owned by the current user
    const q = query(
      collection(db, 'books'),
      where('status', 'in', ['disponível', 'em processo de empréstimo', 'emprestado'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const books = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(book => book.ownerId !== user.uid); // filter out my own books
      setAvailableBooks(books);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'books');
    });

    return () => unsubscribe();
  }, [user]);

  const executeBorrowRequest = async (book: any) => {
    if (!user || !userData) return;
    try {
      await updateDoc(doc(db, 'books', book.id), {
        status: 'em processo de empréstimo',
        borrowerId: user.uid,
        borrowerName: userData.name,
        borrowerEmail: userData.email,
        ownerConfirmed: false,
        borrowerConfirmed: false
      });
      
      if (book.ownerEmail) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: book.ownerEmail,
              subject: `Solicitação de Empréstimo: ${book.title}`,
              text: `Olá ${book.ownerName},\n\nGostaria de solicitar o empréstimo do livro "${book.title}".\n\nPor favor, acesse o sistema para confirmar a entrega.\n\nAtenciosamente,\n${userData.name}`
            })
          });
        } catch (err) {
          console.error("Erro ao enviar notificação por e-mail", err);
        }
      }

      setAlertInfo({ title: 'Sucesso', message: 'Solicitação enviada com sucesso! Aguarde a confirmação do dono.' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${book.id}`);
    }
  };

  const executeCancelRequest = async (bookId: string) => {
    try {
      await updateDoc(doc(db, 'books', bookId), {
        status: 'disponível',
        borrowerId: null,
        borrowerName: null,
        borrowerEmail: null,
        ownerConfirmed: false,
        borrowerConfirmed: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${bookId}`);
    }
  };

  const executeNotifyMe = async (book: any) => {
    if (!user || !userData) return;
    try {
      const currentWaitlist = book.waitlist || [];
      const isAlreadyInWaitlist = currentWaitlist.some((w: any) => w.uid === user.uid);
      
      if (isAlreadyInWaitlist) {
        setAlertInfo({ title: 'Aviso', message: 'Você já está na lista de espera para este livro.' });
        return;
      }

      const newWaitlist = [...currentWaitlist, { uid: user.uid, name: userData.name, email: userData.email }];
      
      await updateDoc(doc(db, 'books', book.id), {
        waitlist: newWaitlist
      });
      
      setAlertInfo({ title: 'Sucesso', message: 'Você será avisado por e-mail quando o livro estiver disponível!' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${book.id}`);
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'borrow') {
      executeBorrowRequest(confirmAction.payload);
    } else if (confirmAction.type === 'cancel') {
      executeCancelRequest(confirmAction.payload);
    } else if (confirmAction.type === 'notify') {
      executeNotifyMe(confirmAction.payload);
    }
    setConfirmAction(null);
  };

  const handleBorrowRequest = (book: any) => {
    setConfirmAction({ type: 'borrow', payload: book });
  };

  const handleCancelRequest = (bookId: string) => {
    setConfirmAction({ type: 'cancel', payload: bookId });
  };

  const handleNotifyMe = (book: any) => {
    setConfirmAction({ type: 'notify', payload: book });
  };

  const filteredBooks = availableBooks.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const available = filteredBooks.filter(b => b.status === 'disponível');
  const inProcess = filteredBooks.filter(b => b.status === 'em processo de empréstimo');
  const borrowed = filteredBooks.filter(b => b.status === 'emprestado');

  const renderBookCard = (book: any) => (
    <div key={book.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 flex flex-col">
      <div className="p-5 flex-1">
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-1">
            <Book className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4 w-0 flex-1">
            <h3 className="text-lg font-medium text-gray-900 line-clamp-2" title={book.title}>
              {book.title}
            </h3>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          {book.author && (
            <div className="flex items-center text-sm text-gray-500">
              <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
              <span className="truncate">Autor(a): {book.author}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-gray-500">
            <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span className="truncate">Dono: {book.ownerName}</span>
          </div>

          {book.synopsis && (
            <div className="mt-3">
              <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                Sinopse
              </div>
              <p className="text-sm text-gray-600 line-clamp-3" title={book.synopsis}>
                {book.synopsis}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
        {book.status === 'disponível' ? (
          <button
            onClick={() => handleBorrowRequest(book)}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Send className="h-4 w-4 mr-2" />
            Solicitar Empréstimo
          </button>
        ) : book.status === 'emprestado' ? (
          <button
            onClick={() => handleNotifyMe(book)}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Bell className="h-4 w-4 mr-2" />
            Avise-me quando disponível
          </button>
        ) : book.borrowerId === user?.uid ? (
          <button
            onClick={() => handleCancelRequest(book.id)}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar solicitação
          </button>
        ) : (
          <button
            disabled
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 bg-gray-200 cursor-not-allowed"
          >
            <Clock className="h-4 w-4 mr-2" />
            Em processo
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Biblioteca da Empresa</h2>
          <p className="text-sm text-gray-500">Livros de outros colegas</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Buscar livros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <Book className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum livro encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            Não há livros correspondentes à sua busca.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {available.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Disponíveis</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {available.map(renderBookCard)}
              </div>
            </section>
          )}

          {inProcess.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Em Processo de Empréstimo</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {inProcess.map(renderBookCard)}
              </div>
            </section>
          )}

          {borrowed.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Emprestados</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {borrowed.map(renderBookCard)}
              </div>
            </section>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        title={
          confirmAction?.type === 'borrow' ? 'Solicitar Empréstimo' : 
          confirmAction?.type === 'notify' ? 'Aviso de Disponibilidade' : 
          'Cancelar Solicitação'
        }
        message={
          confirmAction?.type === 'borrow' ? 'Deseja solicitar o empréstimo deste livro? O dono será notificado.' : 
          confirmAction?.type === 'notify' ? 'Deseja entrar na lista de espera para ser avisado quando este livro for devolvido?' : 
          'Deseja cancelar sua solicitação de empréstimo?'
        }
        confirmText="Sim"
        cancelText="Não"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
      <AlertModal
        isOpen={!!alertInfo}
        title={alertInfo?.title || ''}
        message={alertInfo?.message || ''}
        onClose={() => setAlertInfo(null)}
      />
    </div>
  );
}
