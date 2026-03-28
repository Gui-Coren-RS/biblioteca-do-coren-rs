import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Plus, Book, CheckCircle, Clock, Edit2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ConfirmModal } from './Modals';

export function Dashboard() {
  const { user, userData } = useAuth();
  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', synopsis: '', author: '' });
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'deny', payload: any } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch books I own
    const qOwned = query(collection(db, 'books'), where('ownerId', '==', user.uid));
    const unsubOwned = onSnapshot(qOwned, (snapshot) => {
      const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyBooks(books);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'books');
    });

    // Fetch books I borrowed
    const qBorrowed = query(collection(db, 'books'), where('borrowerId', '==', user.uid));
    const unsubBorrowed = onSnapshot(qBorrowed, (snapshot) => {
      const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBorrowedBooks(books);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'books');
    });

    return () => {
      unsubOwned();
      unsubBorrowed();
    };
  }, [user]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !user || !userData) return;

    try {
      await addDoc(collection(db, 'books'), {
        title: newTitle.trim(),
        synopsis: newSynopsis.trim(),
        author: newAuthor.trim(),
        ownerId: user.uid,
        ownerName: userData.name,
        ownerEmail: userData.email,
        status: 'disponível',
        createdAt: new Date(),
        borrowerId: null,
        borrowerName: null,
        loanDate: null,
        returnDate: null,
        ownerConfirmed: false,
        borrowerConfirmed: false
      });
      setNewTitle('');
      setNewSynopsis('');
      setNewAuthor('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'books');
    }
  };

  const startEditing = (book: any) => {
    setEditingBookId(book.id);
    setEditForm({
      title: book.title,
      synopsis: book.synopsis || '',
      author: book.author || ''
    });
  };

  const handleSaveEdit = async (bookId: string) => {
    try {
      await updateDoc(doc(db, 'books', bookId), {
        title: editForm.title.trim(),
        synopsis: editForm.synopsis.trim(),
        author: editForm.author.trim()
      });
      setEditingBookId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${bookId}`);
    }
  };

  const handleOwnerConfirm = async (book: any) => {
    try {
      const updates: any = { ownerConfirmed: true };
      if (book.borrowerConfirmed) {
        updates.status = 'emprestado';
        updates.loanDate = new Date();
        updates.returnDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
      }
      await updateDoc(doc(db, 'books', book.id), updates);
      
      if (book.borrowerEmail) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: book.borrowerEmail,
              subject: `Empréstimo Confirmado: ${book.title}`,
              text: `Olá ${book.borrowerName},\n\nO dono do livro "${book.title}" (${book.ownerName}) confirmou a entrega do livro para você.\n\nLembre-se de confirmar o recebimento no sistema.\n\nAtenciosamente,\nBiblioteca da Empresa`
            })
          });
        } catch (err) {
          console.error("Erro ao enviar notificação por e-mail", err);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${book.id}`);
    }
  };

  const executeDenyRequest = async (book: any) => {
    try {
      await updateDoc(doc(db, 'books', book.id), {
        status: 'disponível',
        borrowerId: null,
        borrowerName: null,
        borrowerEmail: null,
        ownerConfirmed: false,
        borrowerConfirmed: false
      });

      if (book.borrowerEmail) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: book.borrowerEmail,
              subject: `Solicitação Negada: ${book.title}`,
              text: `Olá ${book.borrowerName},\n\nInfelizmente, a sua solicitação de empréstimo do livro "${book.title}" foi negada pelo dono (${book.ownerName}).\n\nAtenciosamente,\nBiblioteca da Empresa`
            })
          });
        } catch (err) {
          console.error("Erro ao enviar notificação por e-mail", err);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${book.id}`);
    }
  };

  const handleBorrowerConfirm = async (book: any) => {
    try {
      const updates: any = { borrowerConfirmed: true };
      if (book.ownerConfirmed) {
        updates.status = 'emprestado';
        updates.loanDate = new Date();
        updates.returnDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      }
      await updateDoc(doc(db, 'books', book.id), updates);

      if (book.ownerEmail) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: book.ownerEmail,
              subject: `Recebimento Confirmado: ${book.title}`,
              text: `Olá ${book.ownerName},\n\nO solicitante (${book.borrowerName}) confirmou o recebimento do livro "${book.title}".\n\nO empréstimo está agora ativo no sistema.\n\nAtenciosamente,\nBiblioteca da Empresa`
            })
          });
        } catch (err) {
          console.error("Erro ao enviar notificação por e-mail", err);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${book.id}`);
    }
  };

  const handleReturnBook = async (book: any) => {
    try {
      await updateDoc(doc(db, 'books', book.id), {
        status: 'disponível',
        borrowerId: null,
        borrowerName: null,
        borrowerEmail: null,
        loanDate: null,
        returnDate: null,
        ownerConfirmed: false,
        borrowerConfirmed: false,
        waitlist: [] // Clear waitlist after notifying
      });

      if (book.ownerEmail) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: book.ownerEmail,
              subject: `Livro Devolvido: ${book.title}`,
              text: `Olá ${book.ownerName},\n\nO livro "${book.title}" foi marcado como devolvido por ${book.borrowerName}.\n\nEle já está disponível novamente na biblioteca.\n\nAtenciosamente,\nBiblioteca da Empresa`
            })
          });
        } catch (err) {
          console.error("Erro ao enviar notificação por e-mail", err);
        }
      }

      // Notify waitlist
      if (book.waitlist && book.waitlist.length > 0) {
        const waitlistEmails = book.waitlist.map((w: any) => w.email).join(',');
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: waitlistEmails,
              subject: `Livro Disponível: ${book.title}`,
              text: `Olá,\n\nO livro "${book.title}" que você estava aguardando acabou de ficar disponível na biblioteca!\n\nAcesse o sistema para solicitar o empréstimo.\n\nAtenciosamente,\nBiblioteca da Empresa`
            })
          });
        } catch (err) {
          console.error("Erro ao enviar notificação para a lista de espera", err);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${book.id}`);
    }
  };

  const executeDeleteBook = async (bookId: string) => {
    try {
      await deleteDoc(doc(db, 'books', bookId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `books/${bookId}`);
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete') {
      executeDeleteBook(confirmAction.payload);
    } else if (confirmAction.type === 'deny') {
      executeDenyRequest(confirmAction.payload);
    }
    setConfirmAction(null);
  };

  const handleDenyRequest = (book: any) => {
    setConfirmAction({ type: 'deny', payload: book });
  };

  const handleDeleteBook = (bookId: string) => {
    setConfirmAction({ type: 'delete', payload: bookId });
  };

  return (
    <div className="space-y-8 transition-colors duration-200">
      {/* Livros Cadastrados (Meus Livros Disponíveis) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Livros Cadastrados (Disponíveis)</h2>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Livro
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAddBook} className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4 transition-colors duration-200">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título do Livro *"
              className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border dark:bg-gray-700 dark:text-white transition-colors duration-200"
              required
            />
            <input
              type="text"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              placeholder="Autor(a)"
              className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border dark:bg-gray-700 dark:text-white transition-colors duration-200"
            />
            <textarea
              value={newSynopsis}
              onChange={(e) => setNewSynopsis(e.target.value)}
              placeholder="Sinopse"
              rows={3}
              className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border dark:bg-gray-700 dark:text-white transition-colors duration-200"
            />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors duration-200">
                Salvar
              </button>
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {myBooks.filter(b => b.status === 'disponível').length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                Você não tem livros disponíveis no momento.
              </li>
            ) : (
              myBooks.filter(b => b.status === 'disponível').map((book) => (
                <li key={book.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200">
                  {editingBookId === book.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                        className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm p-2 border text-sm dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="Título"
                      />
                      <input
                        type="text"
                        value={editForm.author}
                        onChange={(e) => setEditForm({...editForm, author: e.target.value})}
                        className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm p-2 border text-sm dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="Autor(a)"
                      />
                      <textarea
                        value={editForm.synopsis}
                        onChange={(e) => setEditForm({...editForm, synopsis: e.target.value})}
                        className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm p-2 border text-sm dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="Sinopse"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(book.id)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200">Salvar</button>
                        <button onClick={() => setEditingBookId(null)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start">
                        <Book className="h-6 w-6 text-green-500 dark:text-green-400 mr-3 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{book.title}</p>
                          {book.author && <p className="text-xs text-gray-600 dark:text-gray-400">Autor(a): {book.author}</p>}
                          {book.synopsis && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{book.synopsis}</p>}
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Status: <span className="text-green-600 dark:text-green-400">{book.status}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 shrink-0">
                        <button
                          onClick={() => startEditing(book)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors duration-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 ml-4 transition-colors duration-200"
                        >
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {/* Livros Emprestados (Meus Livros com Outros) */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Livros Emprestados (Com Outros)</h2>
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {myBooks.filter(b => b.status === 'emprestado' || b.status === 'em processo de empréstimo').length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                Nenhum livro seu está emprestado ou em processo no momento.
              </li>
            ) : (
              myBooks.filter(b => b.status === 'emprestado' || b.status === 'em processo de empréstimo').map((book) => (
                <li key={book.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200">
                  <div className="flex items-start">
                    <Book className={`h-6 w-6 mr-3 mt-1 ${book.status === 'emprestado' ? 'text-orange-400 dark:text-orange-500' : 'text-yellow-500 dark:text-yellow-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{book.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Status: <span className={book.status === 'emprestado' ? 'text-orange-600 dark:text-orange-400' : 'text-yellow-600 dark:text-yellow-400'}>{book.status}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Solicitado por: {book.borrowerName}
                      </p>
                      
                      {book.status === 'em processo de empréstimo' && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded text-xs text-yellow-800 dark:text-yellow-200 transition-colors duration-200">
                          {!book.ownerConfirmed ? (
                            "Você precisa confirmar a entrega do livro."
                          ) : (
                            "Aguardando o solicitante confirmar o recebimento."
                          )}
                        </div>
                      )}

                      {book.status === 'emprestado' && (
                        <>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Emprestado em: {book.loanDate?.toDate ? format(book.loanDate.toDate(), "dd/MM/yyyy", { locale: ptBR }) : ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Devolução prevista: {book.returnDate?.toDate ? format(book.returnDate.toDate(), "dd/MM/yyyy", { locale: ptBR }) : ''}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 shrink-0">
                    {book.status === 'em processo de empréstimo' && !book.ownerConfirmed && (
                      <>
                        <button
                          onClick={() => handleOwnerConfirm(book)}
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors duration-200"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar Entrega
                        </button>
                        <button
                          onClick={() => handleDenyRequest(book)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Negar Solicitação
                        </button>
                      </>
                    )}
                    {book.status === 'emprestado' && (
                      <button
                        onClick={() => handleReturnBook(book)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Marcar como Devolvido
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {/* Livros Comigo (Peguei Emprestado) */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Livros Comigo (Emprestados)</h2>
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {borrowedBooks.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                Você não tem nenhum livro emprestado no momento.
              </li>
            ) : (
              borrowedBooks.map((book) => (
                <li key={book.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200">
                  <div className="flex items-start">
                    <Clock className={`h-6 w-6 mr-3 mt-1 ${book.status === 'emprestado' ? 'text-orange-400 dark:text-orange-500' : 'text-yellow-500 dark:text-yellow-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{book.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Dono: {book.ownerName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Status: <span className={book.status === 'emprestado' ? 'text-orange-600 dark:text-orange-400' : 'text-yellow-600 dark:text-yellow-400'}>{book.status}</span>
                      </p>

                      {book.status === 'em processo de empréstimo' && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded text-xs text-yellow-800 dark:text-yellow-200 transition-colors duration-200">
                          {!book.borrowerConfirmed ? (
                            "Você precisa confirmar o recebimento do livro."
                          ) : (
                            "Aguardando o dono confirmar a entrega."
                          )}
                        </div>
                      )}

                      {book.status === 'emprestado' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Data do empréstimo: {book.loanDate?.toDate ? format(book.loanDate.toDate(), "dd/MM/yyyy", { locale: ptBR }) : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 shrink-0">
                    {book.status === 'em processo de empréstimo' && !book.borrowerConfirmed && (
                      <button
                        onClick={() => handleBorrowerConfirm(book)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors duration-200"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirmar Recebimento
                      </button>
                    )}
                    {book.status === 'emprestado' && (
                      <button
                        onClick={() => handleReturnBook(book)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Devolver
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.type === 'delete' ? 'Excluir Livro' : 'Negar Solicitação'}
        message={confirmAction?.type === 'delete' ? 'Tem certeza que deseja excluir este livro?' : 'Tem certeza que deseja negar esta solicitação?'}
        confirmText="Sim"
        cancelText="Não"
        confirmColor="red"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
