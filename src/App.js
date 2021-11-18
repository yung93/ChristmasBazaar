import {useRef, useState, useEffect, useCallback} from 'react';
import {useForm, Controller} from 'react-hook-form';
import { GoogleSpreadsheet } from 'google-spreadsheet';

import './App.css';
import Selector from "./Selector";
import {Button} from "reactstrap";
import BackIcon from './assets/caret-left.svg';
import PlusIcon from './assets/plus-lg.svg';
import RemoveIcon from './assets/person-x.svg';
import BellIcon from './assets/bells.png';

const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.REACT_APP_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const day = (new Date()).getDate() > 25 ? '2' : '1'


const TIMESLOTS_TABLE = {day1: 1358113787, day2: 985358221}[`day${day}`];
const RESPONSE_TABLE = {day1: 883456226, day2: 1241199622}[`day${day}`];

const whereOptions = [
  {label: '朋友', value: '朋友'},
  {label: '家人', value: '家人'},
  {label: '網上', value: '網上'},
  {label: '其他', value: '其他'},
]

function App() {
  const carouselRef = useRef(null);
  const [width, setWidth] = useState(window.innerWidth * 0.9);
  const [page, setPage] = useState(0);
  const [isReferred, setIsReferred] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [info, setInfo] = useState({});
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(false);

  const [workshopOptions, setWorkshopOptions] = useState({});
  const [timetable, setTimeTable] = useState({});

  const { handleSubmit, control, getValues, register, unregister, formState: {errors} } = useForm();
  const { handleSubmit: handleSubmitCompany, register: registerCompany, unregister: unregisterCompany, formState: {errors: errorsCompany} } = useForm();
  const { handleSubmit: handleSubmitWorkshop, control: controlWorkshop, register: registerWorkshop, unregister: unregisterWorkshop, formState: {errors: errorsWorkshop} } = useForm();
  const doc = new GoogleSpreadsheet(SHEET_ID);

  useEffect(() => {
    initGoogleSheet();
  }, []);

  useEffect(() => {
    setWidth(carouselRef.current.offsetWidth);
  }, [carouselRef])

  const initGoogleSheet = useCallback(async () => {
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
    const sheet = doc.sheetsById[TIMESLOTS_TABLE];
    const rows = await sheet.getRows({limit: 10}); // can pass in { limit, offset }
    if (rows) {
      const temp = {};
      rows.forEach((row) => {
        row._sheet.headerValues.forEach((key) => {
          if (row[key]) {
            temp[key] = [...(temp[key] || []), row[key]];
          }
        })
      });
      setWorkshopOptions(temp);
    };
  }, [])

  const handleWhereSelect = useCallback((value) => {
    if(['朋友', '家人'].includes(getValues('where'))) {
      setIsReferred(true);
    } else {
      unregister('referral');
      setIsReferred(false);
    }
  }, [unregister, getValues]);

  const onSubmitInfo = useCallback((data) => {
    setPage(1);
    setInfo(data);
  }, []);

  const onSubmitCompany = useCallback((data) => {
    setPage(2);
    setCompany(data.company || []);
  }, []);

  const onSubmitWorkshop = useCallback(async(data) => {
    setLoading(true);
    const row = {
      '日期': (new Date()).toLocaleString("en-US"),
      '姓名': info.name,
      '電話': info.phone,
      '從哪裏得知': info.where,
      '介紹人': info.referral,
      '同行人': company.filter((row) => !!row).map((row) => `${row.name}(${row.phone})`).join(';'),
      ...data,
    }
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
    const sheet = doc.sheetsById[RESPONSE_TABLE];
    try {
      await sheet.loadHeaderRow()
    }
    catch {
      await sheet.setHeaderRow(Object.keys(row));
    } finally {
      await sheet.addRow(row);
      setLoading(false);
      setPage(3);
    }
  }, [info, company]);

  const handleBack = useCallback(() => {
    setPage(page-1);
  }, [page]);

  const handleAddCompany = useCallback(() => {
    setCompanies([...companies, companies.length]);
  }, [companies]);

  const handleRemoveCompany = useCallback((index) => {
    const temp = [...companies];
    temp[index] = null;
    setCompanies(temp);
    unregisterCompany(`company.${index}`)
  }, [companies]);

  const handleTimeSelect = useCallback((workshop, timeslot, onChange) => {
    const temp = {...timetable};
    temp[timeslot] = {...(temp[timeslot] || {})}
    if (temp[timeslot][workshop]) {
      delete temp[timeslot][workshop];
      unregisterWorkshop(`${workshop}.${timeslot}`);
    } else {
      temp[timeslot][workshop] = 1;
      onChange(temp[timeslot][workshop]);
    }
    setTimeTable(temp);
  }, [timetable]);

  const handleDecrease = useCallback((workshop, timeslot, onChange) => {
    const temp = {...timetable};
    temp[timeslot] = {...(temp[timeslot] || {})}
    if (temp[timeslot][workshop] && temp[timeslot][workshop] > 1) {
      temp[timeslot][workshop] = temp[timeslot][workshop] - 1;
      onChange(temp[timeslot][workshop]);
    } else if (temp[timeslot][workshop] && temp[timeslot][workshop] === 1) {
      delete temp[timeslot][workshop];
      unregisterWorkshop(`${workshop}.${timeslot}`);
    }
    setTimeTable(temp);
  }, [timetable]);

  const handleIncrease = useCallback((workshop, timeslot, onChange) => {
    const temp = {...timetable};
    temp[timeslot] = {...(temp[timeslot] || {})};
    const max = companies.filter((value => value !== null)).length + 1;
    if (temp[timeslot][workshop] && temp[timeslot][workshop] < max) {
      temp[timeslot][workshop] = temp[timeslot][workshop] + 1;
    }
    onChange(temp[timeslot][workshop]);
    setTimeTable(temp);
  }, [timetable, companies]);

  return (
    <div className="app">
        <div className="carousel" ref={carouselRef}>
          <div className={'content'} style={{ marginLeft: -width * page}}>
            <div style={{ minWidth: width }}>
              <form id="infoForm" className="form" onSubmit={handleSubmit(onSubmitInfo)}>
                <div className={'header'}>{`歡迎參與聖誕市集(DAY${day})`}</div>
                <div className="form-group">
                  <div className="label" htmlFor="name">姓名</div>
                  {
                    errors.name && <div className={'error'}>請輸入姓名</div>
                  }
                  <input id="name" name="name" type="text" {...register('name', {required: true})}/>
                </div>
                <div className="form-group">
                  <div className="label" htmlFor="phone">電話</div>
                  {
                    errors.phone && <div className={'error'}>請輸入電話號碼</div>
                  }
                  <input id="phone" name="phone" type="tel" {...register('phone', {required: true})}/>
                </div>
                <div className="form-group">
                  <div className="label" htmlFor="where">從哪裏得知這個活動？</div>
                  {
                    errors.where && <div className={'error'}>請選擇其中一項</div>
                  }
                  <Selector options={whereOptions} name={'where'} control={control} onSelect={handleWhereSelect} required/>
                </div>
                {
                  isReferred &&
                  <div className="form-group">
                    <div className="label" htmlFor="referral">介紹人姓名</div>
                    {
                      errors.referral && <div className={'error'}>請輸入介紹人姓名</div>
                    }
                    <input id="referral" name="referral" type="text" {...register('referral', {required: true})}/>
                  </div>
                }
              </form>
            </div>
            <div style={{ minWidth: width }}>
              <form id={'companyForm'} className={'form'} onSubmit={handleSubmitCompany(onSubmitCompany)}>
                <div className={'form-group inline'}>
                    <div className={'label'}>同行親友</div>
                    <Button color={'secondary'} type={'button'} onClick={handleAddCompany}><img src={PlusIcon} /></Button>
                </div>
                {
                  errorsCompany.company && <div className={'error'}>請輸入同行人資料</div>
                }
                <div>
                    {
                      companies.filter((index) => index !== null).map((index) => {
                        return (
                          <div className={'form-group inline'} key={`company_${index}`}>
                            <div className={'form-group inline'}>
                              <input placeholder={'姓名'} name={`company.${index}.name`} type="text" {...registerCompany(`company.${index}.name`, {required: true})} className={`${errorsCompany.company && errorsCompany.company[index] && errorsCompany.company[index].name ? 'invalid' : ''}`} />
                              <input placeholder={'電話'} name={`company.${index}.phone`} type="tel" {...registerCompany(`company.${index}.phone`, {required: true})} className={`${errorsCompany.company && errorsCompany.company[index] && errorsCompany.company[index].phone ? 'invalid' : ''}`} />
                              <div className={'remove-button'} onClick={() => {handleRemoveCompany(index)}}><img src={RemoveIcon}/></div>
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
              </form>
            </div>
            <div style={{ minWidth: width }}>
              <form id={'workshopForm'} className={'form'} onSubmit={handleSubmitWorkshop(onSubmitWorkshop)}>
                <div className={'label'}>{`是日工作坊(${new Date().getDate()}/${new Date().getMonth()+1})`}</div>
                <div className={'hints'}>請選擇有興趣參與的工作坊</div>
                {
                  Object.keys(workshopOptions).map((workshopName) => {
                    return (
                      <div className={'workshop-group'} key={`workshop_${workshopName}`}>
                        <div className={'form-group inline'}>
                          <div className={'label'}>{workshopName}</div>
                          <div className={'hint'}>參加人數</div>
                        </div>
                        <div>
                          {
                            workshopOptions[workshopName].map((timeslot) => {
                              const active = timetable[timeslot] && timetable[timeslot][workshopName];
                              const value = timetable[timeslot] ? timetable[timeslot][workshopName] || 0 : 0;

                              const sum = Object.keys(timetable[timeslot] || {}).reduce((acc, key) => {
                                return acc + (key === workshopName ? 0 : (timetable[timeslot][key] || 0))
                              }, 0);
                              const max = companies.filter((value => value !== null)).length + 1;

                              const disabled = max - sum <= 0;

                              return (
                                <Controller
                                  key={`workshop_${workshopName}_${timeslot}`}
                                  control={controlWorkshop}
                                  name={`${workshopName}(${timeslot})`}
                                  render={({field: {onChange}}) => (
                                    <div className={'timepicker noselect'}>
                                      <div
                                        className={`select-button${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                                        onClick={() => {if (disabled) return; handleTimeSelect(workshopName, timeslot, onChange)}}
                                        key={`${workshopName}_${timeslot}`}
                                      >
                                        {timeslot}
                                      </div>
                                      {
                                        active &&
                                        <div className={'numberWrapper'}>
                                          <div className={`minus${value<=0 ? ' disabled' : ''}`} onClick={() => {
                                            if (value<=0) return ;
                                            handleDecrease(workshopName, timeslot, onChange);
                                          }}> - </div>
                                          <div className={'value'}>{value}</div>
                                          <div className={`plus${value>=max-sum ? ' disabled' : ''}`} onClick={() => {
                                            if (value>=max-sum) return ;
                                            handleIncrease(workshopName, timeslot, onChange);
                                          }}> + </div>
                                        </div>
                                      }
                                    </div>
                                  )}
                                />
                              )
                            })
                          }
                        </div>
                      </div>
                    )
                  })
                }
              </form>
            </div>
            <div style={{ minWidth: width }}>
              <form>
                <div className={'label'}>{`多謝參與，${info.name} :)`}</div>
                {
                  Object.keys(timetable).filter((timeslot) => Object.keys(timetable[timeslot]).length > 0).length > 0 &&
                  <div className={'workshop-list'}>
                    <div className={'label'}>{`你已報名下列工作坊，到時見！`}</div>
                    <div>
                      {
                        Object.keys(timetable).filter((timeslot) => Object.keys(timetable[timeslot]).length > 0).sort().map((timeslot) => {
                          return(
                            <div key={`summary_${timeslot}`}>
                              <div className={'label'}>{timeslot}</div>
                              <div>
                                {
                                  Object.keys(timetable[timeslot]).map((workshop) => {
                                    return (
                                      <div className={'workshop-row'} key={`summary_${timeslot}_${workshop}`}>
                                        <div>{workshop}</div>
                                        <div>{`${timetable[timeslot][workshop]}人`}</div>
                                      </div>
                                    )
                                  })
                                }
                              </div>
                            </div>
                          )
                        })
                      }
                    </div>
                  </div>

                }
              </form>
            </div>
          </div>
        </div>
      {
        page === 0 &&
          <div className='bottom-buttons'>
            <Button className="bottom-button" form={'infoForm'} type={'submit'} size={'lg'} color={'primary'}>下一步</Button>
          </div>
      }
      {
        page === 1 &&
          <div className='bottom-buttons'>
            <Button className="bottom-button" size={'lg'} color={'primary'} onClick={handleBack} outline><img src={BackIcon} /></Button>
            <Button className="bottom-button" form={'companyForm'} type={'submit'} size={'lg'} color={'primary'}>{
              companies.filter((index) => index !== null).length > 0 ? '下一步' : '沒有，下一步'
            }</Button>
          </div>
      }
      {
        page === 2 &&
          <div className='bottom-buttons'>
            <Button className="bottom-button" size={'lg'} color={'primary'} onClick={handleBack} outline><img src={BackIcon} /></Button>
            <Button className="bottom-button" form={'workshopForm'} type={'submit'} size={'lg'} color={'primary'}>{
              loading ?
                <div><img className={'loading spinner'} src={BellIcon} /></div> :
                '提交表格'
            }</Button>
          </div>
      }
    </div>
  );
}

export default App;
