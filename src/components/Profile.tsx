import React, { useState } from 'react';
import { useAuth } from '../App';
import { auth, db } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { User, Mail, Lock, Save, Edit2, X } from 'lucide-react';

export function Profile() {
  const { user, userData } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameMessage, setNameMessage] = useState('');
  const [savingName, setSavingName] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      await updatePassword(user, newPassword);
      setMessage('Senha atualizada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Por segurança, você precisa fazer login novamente para alterar a senha.');
      } else {
        setError('Erro ao atualizar a senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditingName = () => {
    if (userData) {
      setNewName(userData.name);
      setIsEditingName(true);
      setNameError('');
      setNameMessage('');
    }
  };

  const handleSaveName = async () => {
    if (!user || !userData) return;
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setNameError('O nome não pode estar vazio.');
      return;
    }

    if (trimmedName === userData.name) {
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    setNameError('');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: trimmedName
      });
      setNameMessage('Nome atualizado com sucesso!');
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
      setNameError('Erro ao atualizar o nome.');
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSavingName(false);
    }
  };

  if (!userData) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Perfil do Usuário</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Informações pessoais e de conta.</p>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200 dark:divide-gray-700">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
                Nome Completo
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {isEditingName ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                      disabled={savingName}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition-colors duration-200"
                      title="Salvar"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      disabled={savingName}
                      className="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition-colors duration-200"
                      title="Cancelar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>{userData.name}</span>
                    <button
                      onClick={startEditingName}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center transition-colors duration-200"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar
                    </button>
                  </div>
                )}
                {nameError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{nameError}</p>}
                {nameMessage && !isEditingName && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{nameMessage}</p>}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
                E-mail Funcional
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{userData.email}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center">
            <Lock className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
            Alterar Senha
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            <p>Sua senha pode conter letras e números e é de livre escolha.</p>
          </div>
          <form className="mt-5 sm:flex sm:items-center" onSubmit={handleUpdatePassword}>
            <div className="w-full sm:max-w-xs space-y-3">
              <input
                type="password"
                name="newPassword"
                id="newPassword"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                placeholder="Nova Senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                placeholder="Confirmar Nova Senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-colors duration-200"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {message && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{message}</p>}
        </div>
      </div>
    </div>
  );
}
