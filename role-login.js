const form=document.getElementById("loginForm"),message=document.getElementById("authMessage");
const slug=form.dataset.role;
const roles={"super-admin":"super_admin","patrol-leader":"patrol_leader","member":"member"};
function showMessage(text){message.textContent=text;message.style.display="block";}
document.getElementById("forgot")?.addEventListener("click",()=>showMessage("For a forgotten password, contact the Super Administrator. A secure reset process can be arranged for your account."));
form.addEventListener("submit",async event=>{
 event.preventDefault();message.style.display="none";
 const client=window.oymsSupabase;if(!client){showMessage("Secure sign-in could not load. Refresh this page and try again.");return;}
 if(!roles[slug]){showMessage("Secure sign-in is not enabled for this role.");return;}
 const button=form.querySelector('button[type="submit"]'),loginId=document.getElementById("loginId").value.trim(),password=document.getElementById("password").value;
 button.disabled=true;button.textContent="Signing in…";
 try{
  const {data,error}=await client.functions.invoke("login-by-id",{body:{login_id:loginId,password,role:roles[slug]}});
  if(error)throw error;if(!data?.success)throw new Error(data?.error||"Unable to sign in.");
  const {error:sessionError}=await client.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
  if(sessionError)throw sessionError;
  if(data.must_change_password){window.location.href="../../change-password.html";return;}
  window.location.href="../../"+slug+"/dashboard/";
 }catch(error){showMessage(error.message||"Login ID or password is incorrect.");}
 finally{button.disabled=false;button.textContent="Sign In";}
});